import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const SHELL_LOOKUP_TIMEOUT_MS = 3000;
const ACCESS_KEY_START_MARKER = "__AIHUBMIX_ACCESS_KEY_START__";
const ACCESS_KEY_END_MARKER = "__AIHUBMIX_ACCESS_KEY_END__";

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
    const shell = process.env.SHELL || "/bin/zsh";
    const lookupScript = `printf '${ACCESS_KEY_START_MARKER}%s${ACCESS_KEY_END_MARKER}\\n' "$AIHUBMIX_ACCESS_KEY"`;
    const { stdout } = await execFileAsync(shell, ["-ilc", lookupScript], {
      encoding: "utf-8",
      timeout: SHELL_LOOKUP_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
    });
    return extractMarkedValue(stdout, ACCESS_KEY_START_MARKER, ACCESS_KEY_END_MARKER);
  } catch {
    return null;
  }
}

export async function resolveAihubmixAccessKey(preferenceToken?: string): Promise<string | null> {
  const preference = cleanToken(preferenceToken);
  if (preference) return preference;

  return cleanToken(process.env.AIHUBMIX_ACCESS_KEY) ?? (await readShellEnvToken());
}
