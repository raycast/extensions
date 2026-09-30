import { execFile } from "child_process";
import { promisify } from "util";

import { readOpencodeAuthToken } from "../agents/opencode-auth.ts";

const execFileAsync = promisify(execFile);
const SHELL_LOOKUP_TIMEOUT_MS = 3000;
const API_KEY_START_MARKER = "__DEEPSEEK_API_KEY_START__";
const API_KEY_END_MARKER = "__DEEPSEEK_API_KEY_END__";
const KEY_START_MARKER = "__DEEPSEEK_KEY_START__";
const KEY_END_MARKER = "__DEEPSEEK_KEY_END__";

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
      ? `echo ${API_KEY_START_MARKER}%DEEPSEEK_API_KEY%${API_KEY_END_MARKER} & echo ${KEY_START_MARKER}%DEEPSEEK_KEY%${KEY_END_MARKER}`
      : [
          `printf '${API_KEY_START_MARKER}%s${API_KEY_END_MARKER}\\n' "$DEEPSEEK_API_KEY"`,
          `printf '${KEY_START_MARKER}%s${KEY_END_MARKER}\\n' "$DEEPSEEK_KEY"`,
        ].join("; ");
    const shellArgs = isCommandShell ? ["/d", "/s", "/c", lookupScript] : ["-ilc", lookupScript];
    const isBatchShell = shellName.endsWith(".cmd") || shellName.endsWith(".bat");
    const executable = isBatchShell ? process.env.ComSpec || "cmd.exe" : shell;
    const executableArgs = isBatchShell ? ["/d", "/c", shell] : shellArgs;
    const { stdout } = await execFileAsync(executable, executableArgs, {
      encoding: "utf-8",
      timeout: SHELL_LOOKUP_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
    });

    const apiKey = extractMarkedValue(stdout, API_KEY_START_MARKER, API_KEY_END_MARKER);
    const legacyKey = extractMarkedValue(stdout, KEY_START_MARKER, KEY_END_MARKER);
    return (apiKey === "%DEEPSEEK_API_KEY%" ? null : apiKey) ?? (legacyKey === "%DEEPSEEK_KEY%" ? null : legacyKey);
  } catch {
    return null;
  }
}

export async function resolveDeepSeekApiKey(preferenceToken?: string): Promise<string | null> {
  const preference = cleanToken(preferenceToken);
  if (preference) return preference;

  const opencodeToken = readOpencodeAuthToken("deepseek");
  if (opencodeToken) return opencodeToken;

  const direct = cleanToken(process.env.DEEPSEEK_API_KEY) ?? cleanToken(process.env.DEEPSEEK_KEY);
  return direct ?? (await readShellEnvToken());
}
