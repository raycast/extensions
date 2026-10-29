import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const SHELL_LOOKUP_TIMEOUT_MS = 3000;
const API_KEY_START_MARKER = "__ELEVENLABS_API_KEY_START__";
const API_KEY_END_MARKER = "__ELEVENLABS_API_KEY_END__";

function cleanToken(token: string | undefined): string | null {
  const trimmed = token?.trim();
  return trimmed ? trimmed : null;
}

function extractMarkedValue(output: string): string | null {
  const startIndex = output.lastIndexOf(API_KEY_START_MARKER);
  if (startIndex < 0) return null;

  const valueStart = startIndex + API_KEY_START_MARKER.length;
  const endIndex = output.indexOf(API_KEY_END_MARKER, valueStart);
  if (endIndex < 0) return null;

  return cleanToken(output.slice(valueStart, endIndex));
}

async function readShellEnvToken(): Promise<string | null> {
  try {
    const shell = process.env.SHELL || (process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "/bin/zsh");
    const shellName = shell.replaceAll("\\", "/").split("/").pop()?.toLowerCase() ?? "";
    const isCommandShell = shellName === "cmd.exe" || shellName.endsWith(".cmd") || shellName.endsWith(".bat");
    const lookupScript = isCommandShell
      ? `echo ${API_KEY_START_MARKER}!ELEVENLABS_API_KEY!${API_KEY_END_MARKER}`
      : `printf '${API_KEY_START_MARKER}%s${API_KEY_END_MARKER}\\n' "$ELEVENLABS_API_KEY"`;
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

    const apiKey = extractMarkedValue(stdout);
    return apiKey === "%ELEVENLABS_API_KEY%" ? null : apiKey;
  } catch {
    return null;
  }
}

export async function resolveElevenLabsApiKey(preferenceToken?: string): Promise<string | null> {
  return cleanToken(preferenceToken) ?? cleanToken(process.env.ELEVENLABS_API_KEY) ?? (await readShellEnvToken());
}
