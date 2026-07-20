import { execFile } from "child_process";
import { promisify } from "util";
import { readOpencodeAuthToken } from "../agents/opencode-auth";

const execFileAsync = promisify(execFile);
const SHELL_LOOKUP_TIMEOUT_MS = 3000;
const MINIMAX_START_MARKER = "__MINIMAX_API_KEY_START__";
const MINIMAX_END_MARKER = "__MINIMAX_API_KEY_END__";

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

async function readShellEnvTokens(): Promise<string | null> {
  try {
    const shell = process.env.SHELL || "/bin/zsh";
    const lookupScript = `printf '${MINIMAX_START_MARKER}%s${MINIMAX_END_MARKER}\\n' "$MINIMAX_API_KEY"`;

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
  const direct = cleanToken(process.env.MINIMAX_API_KEY);
  if (direct) return direct;

  return await readShellEnvTokens();
}

export async function resolveMiniMaxAuthTokens(
  options: { preferenceToken?: string } = {},
): Promise<{ primaryToken: string | null; localToken: string | null; preferenceToken: string | null }> {
  const pref1 = cleanToken(options.preferenceToken);

  if (pref1) {
    return { primaryToken: pref1, localToken: null, preferenceToken: pref1 };
  }

  const opencodeToken = readOpencodeAuthToken("minimax-coding-plan");
  const envToken = await readEnvToken();
  const localToken = opencodeToken ?? envToken;

  if (localToken) {
    return { primaryToken: localToken, localToken, preferenceToken: null };
  }

  return { primaryToken: null, localToken: null, preferenceToken: null };
}
