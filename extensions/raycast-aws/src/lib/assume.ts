import { execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import { runAppleScript } from "@raycast/utils";

const execFileAsync = promisify(execFile);

// Common Granted/Homebrew install locations; Raycast commands don't inherit the user's shell PATH.
const ASSUMEGO_CANDIDATES = [
  "/opt/homebrew/bin/assumego",
  "/usr/local/bin/assumego",
];
const GRANTED_CANDIDATES = [
  "/opt/homebrew/bin/granted",
  "/usr/local/bin/granted",
];

export function resolveAssumegoPath(): string {
  return ASSUMEGO_CANDIDATES.find((path) => existsSync(path)) ?? "assumego";
}

export function resolveGrantedPath(): string {
  return GRANTED_CANDIDATES.find((path) => existsSync(path)) ?? "granted";
}

// Raycast runs commands outside of any shell, so Granted can't detect a shell to set up its
// alias and fails with "couldn't detect your shell type". This tells it the alias (which these
// one-shot commands don't need) is already configured, skipping that onboarding check.
function envWithAliasConfigured(): NodeJS.ProcessEnv {
  return { ...process.env, GRANTED_ALIAS_CONFIGURED: "true" };
}

/** Opens the AWS web console for a profile using Granted's `assumego -c` (no shell sourcing required). */
export async function openConsole(
  profileName: string,
  region?: string,
): Promise<void> {
  const args = ["-c", profileName];
  if (region) args.push("-r", region);
  await execFileAsync(resolveAssumegoPath(), args, {
    env: envWithAliasConfigured(),
  });
}

/** Runs a Granted CLI command and streams its output so a device code can be shown to the user
 * before they approve it in the browser, instead of blocking until the whole command completes. */
export interface SsoDeviceCode {
  code: string;
  verificationUrl?: string;
}

export interface GrantedCommandSession {
  /** Resolves once the device code is printed (or null if the process exited before printing one). */
  deviceCode: Promise<SsoDeviceCode | null>;
  /** Resolves with the full captured output once the command completes, rejects on failure. */
  completion: Promise<string>;
  cancel: () => void;
}

function stripAnsi(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

function runGrantedCommand(args: string[]): GrantedCommandSession {
  const child = spawn(resolveGrantedPath(), args, {
    env: envWithAliasConfigured(),
  });

  let output = "";
  let deviceCodeFound = false;
  let resolveDeviceCode: (value: SsoDeviceCode | null) => void;
  const deviceCode = new Promise<SsoDeviceCode | null>((resolve) => {
    resolveDeviceCode = resolve;
  });

  function handleOutput(chunk: Buffer) {
    output += stripAnsi(chunk.toString());
    if (deviceCodeFound) return;
    const codeMatch = output.match(/Code:\s*([A-Z0-9-]+)/i);
    if (!codeMatch) return;
    deviceCodeFound = true;
    const urlMatch = output.match(/(https:\/\/\S*device\?user_code=\S+)/);
    resolveDeviceCode({ code: codeMatch[1], verificationUrl: urlMatch?.[1] });
  }

  child.stdout?.on("data", handleOutput);
  child.stderr?.on("data", handleOutput);

  const completion = new Promise<string>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (!deviceCodeFound) resolveDeviceCode(null);
      if (exitCode === 0) {
        resolve(output.trim());
      } else {
        reject(
          new Error(output.trim() || `granted exited with code ${exitCode}`),
        );
      }
    });
  });

  return { deviceCode, completion, cancel: () => child.kill() };
}

/** Starts `granted sso login` (device-code flow). */
export function startSsoLogin(
  ssoRegion: string,
  ssoStartUrl: string,
): GrantedCommandSession {
  return runGrantedCommand([
    "sso",
    "login",
    "--sso-region",
    ssoRegion,
    "--sso-start-url",
    ssoStartUrl,
  ]);
}

export interface SsoPopulateOptions {
  ssoRegion: string;
  ssoStartUrl: string;
  profileTemplate?: string;
  prefix?: string;
  prune?: boolean;
  noCredentialProcess?: boolean;
  useDeviceCode?: boolean;
  ssoBrowserProfile?: string;
}

/** Starts `granted sso populate`, which writes/updates profiles in `~/.aws/config` from AWS SSO. */
export function startSsoPopulate(
  options: SsoPopulateOptions,
): GrantedCommandSession {
  const args = ["sso", "populate", "--sso-region", options.ssoRegion];
  if (options.profileTemplate) {
    args.push("--profile-template", options.profileTemplate);
  }
  if (options.prefix) args.push("--prefix", options.prefix);
  if (options.prune) args.push("--prune");
  if (options.noCredentialProcess) args.push("--no-credential-process");
  if (options.useDeviceCode) args.push("--use-device-code");
  if (options.ssoBrowserProfile) {
    args.push("--sso-browser-profile", options.ssoBrowserProfile);
  }
  args.push(options.ssoStartUrl);
  return runGrantedCommand(args);
}

function escapeForAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Opens a terminal window/tab and runs `assume <profile>`, relying on the user's shell alias. */
export async function openCliSession(
  profileName: string,
  terminalApp: "Terminal" | "iTerm",
): Promise<void> {
  const command = escapeForAppleScriptString(`assume ${profileName}`);

  const script =
    terminalApp === "iTerm"
      ? `
        tell application "iTerm"
          activate
          set newWindow to (create window with default profile)
          tell current session of newWindow
            write text "${command}"
          end tell
        end tell
      `
      : `
        tell application "Terminal"
          activate
          do script "${command}"
        end tell
      `;

  await runAppleScript(script);
}
