import { execFile } from "child_process";
import { promisify } from "util";

import { readOpencodeAuthToken } from "../agents/opencode-auth.ts";

const execFileAsync = promisify(execFile);
const SHELL_LOOKUP_TIMEOUT_MS = 3000;
const API_KEY_START_MARKER = "__OPENROUTER_API_KEY_START__";
const API_KEY_END_MARKER = "__OPENROUTER_API_KEY_END__";
const KEY_START_MARKER = "__OPENROUTER_KEY_START__";
const KEY_END_MARKER = "__OPENROUTER_KEY_END__";

export const OPENROUTER_OPENCODE_KEY = "openrouter";

function cleanToken(token: string | undefined): string | null {
  const trimmed = token?.trim();
  return trimmed ? trimmed : null;
}

function extractMarkedValue(output: string, startMarker: string, endMarker: string): string | null {
  const startIndex = output.lastIndexOf(startMarker);
  if (startIndex < 0) return null;

  const valueStart = startIndex + startMarker.length;
  const endIndex = output.indexOf(endMarker, valueStart);
  if (endIndex < 0) return null;

  return cleanToken(output.slice(valueStart, endIndex));
}

async function readShellEnvToken(): Promise<string | null> {
  try {
    const shell = process.env.SHELL || (process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "/bin/zsh");
    const shellName = shell.replaceAll("\\", "/").split("/").pop()?.toLowerCase() ?? "";
    const isCommandShell = shellName === "cmd.exe" || shellName.endsWith(".cmd") || shellName.endsWith(".bat");
    const lookupScript = isCommandShell
      ? `echo ${API_KEY_START_MARKER}!OPENROUTER_API_KEY!${API_KEY_END_MARKER} & echo ${KEY_START_MARKER}!OPENROUTER_KEY!${KEY_END_MARKER}`
      : [
          `printf '${API_KEY_START_MARKER}%s${API_KEY_END_MARKER}\\n' "$OPENROUTER_API_KEY"`,
          `printf '${KEY_START_MARKER}%s${KEY_END_MARKER}\\n' "$OPENROUTER_KEY"`,
        ].join("; ");
    const shellArgs = isCommandShell ? ["/d", "/v:on", "/s", "/c", lookupScript] : ["-ilc", lookupScript];
    const isBatchShell = shellName.endsWith(".cmd") || shellName.endsWith(".bat");
    const executable = isBatchShell ? process.env.ComSpec || "cmd.exe" : shell;
    // A .cmd/.bat login wrapper must be `call`ed in the same cmd.exe session as the lookup,
    // otherwise the variables it initialises are gone before we echo them.
    const executableArgs = isBatchShell ? ["/d", "/v:on", "/c", `call "${shell}" & ${lookupScript}`] : shellArgs;
    const { stdout } = await execFileAsync(executable, executableArgs, {
      encoding: "utf-8",
      timeout: SHELL_LOOKUP_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
      windowsVerbatimArguments: isCommandShell,
    });

    const apiKey = extractMarkedValue(stdout, API_KEY_START_MARKER, API_KEY_END_MARKER);
    const legacyKey = extractMarkedValue(stdout, KEY_START_MARKER, KEY_END_MARKER);
    return (apiKey === "%OPENROUTER_API_KEY%" ? null : apiKey) ?? (legacyKey === "%OPENROUTER_KEY%" ? null : legacyKey);
  } catch {
    return null;
  }
}

export async function resolveOpenRouterApiKey(preferenceToken?: string): Promise<string | null> {
  const preference = cleanToken(preferenceToken);
  if (preference) return preference;

  const opencodeToken = readOpencodeAuthToken(OPENROUTER_OPENCODE_KEY);
  if (opencodeToken) return opencodeToken;

  const direct = cleanToken(process.env.OPENROUTER_API_KEY) ?? cleanToken(process.env.OPENROUTER_KEY);
  return direct ?? (await readShellEnvToken());
}
