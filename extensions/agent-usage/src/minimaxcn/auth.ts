import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const SHELL_LOOKUP_TIMEOUT_MS = 3000;
const MINIMAX_START_MARKER = "__MINIMAX_API_KEY_START__";
const MINIMAX_END_MARKER = "__MINIMAX_API_KEY_END__";
// Only the CN-dedicated env var is read; MINIMAX_API_KEY targets the international endpoint (api.minimax.io) and would 401 against api.minimaxi.com.
const MINIMAX_CN_ENV_KEY = "MINIMAX_CN_API_KEY" as const;

function cleanToken(token: string | undefined): string | null {
  const trimmed = token?.trim();
  return trimmed ? trimmed : null;
}

function extractMarkedValue(output: string, startMarker: string, endMarker: string): string | null {
  const startIndex = output.lastIndexOf(startMarker);
  if (startIndex < 0) {
    return null;
  }

  const valueStart = startIndex + startMarker.length;
  const endIndex = output.indexOf(endMarker, valueStart);
  if (endIndex < 0) {
    return null;
  }

  return cleanToken(output.slice(valueStart, endIndex));
}

async function readShellEnvTokens(envKey: string): Promise<string | null> {
  try {
    const shell = process.env.SHELL || "/bin/zsh";
    const lookupScript = `printf '${MINIMAX_START_MARKER}%s${MINIMAX_END_MARKER}\\n' "\${${envKey}}"`;

    const { stdout } = await execFileAsync(shell, ["-ilc", lookupScript], {
      encoding: "utf-8",
      timeout: SHELL_LOOKUP_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
    });

    return extractMarkedValue(stdout, MINIMAX_START_MARKER, MINIMAX_END_MARKER);
  } catch {
    return null;
  }
}

async function readEnvToken(): Promise<string | null> {
  const direct = cleanToken(process.env[MINIMAX_CN_ENV_KEY]);
  if (direct) return direct;
  return await readShellEnvTokens(MINIMAX_CN_ENV_KEY);
}

export async function resolveMinimaxCNAuthTokens(
  options: { preferenceToken?: string } = {},
): Promise<{ primaryToken: string | null; localToken: string | null; preferenceToken: string | null }> {
  const pref1 = cleanToken(options.preferenceToken);

  if (pref1) {
    return { primaryToken: pref1, localToken: null, preferenceToken: pref1 };
  }

  // MinimaxCN intentionally does NOT read OpenCode credentials: OpenCode's
  // `minimax-coding-plan` provider id maps to the international endpoint
  // (api.minimax.io), which yields 401/403 against the CN endpoint
  // (api.minimaxi.com). Only env vars and the explicit preference are valid.
  const envToken = await readEnvToken();

  if (envToken) {
    return { primaryToken: envToken, localToken: envToken, preferenceToken: null };
  }

  return { primaryToken: null, localToken: null, preferenceToken: null };
}
