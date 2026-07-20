import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SHELL_LOOKUP_TIMEOUT_MS = 3000;
const GITHUB_TOKEN_START_MARKER = "__GITHUB_TOKEN_START__";
const GITHUB_TOKEN_END_MARKER = "__GITHUB_TOKEN_END__";
const GH_TOKEN_START_MARKER = "__GH_TOKEN_START__";
const GH_TOKEN_END_MARKER = "__GH_TOKEN_END__";

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

function parseShellLookupOutput(output: string): { githubToken: string | null; ghToken: string | null } {
  return {
    githubToken: extractMarkedValue(output, GITHUB_TOKEN_START_MARKER, GITHUB_TOKEN_END_MARKER),
    ghToken: extractMarkedValue(output, GH_TOKEN_START_MARKER, GH_TOKEN_END_MARKER),
  };
}

async function readShellEnvTokens(): Promise<{ githubToken: string | null; ghToken: string | null }> {
  try {
    const shell = process.env.SHELL || "/bin/zsh";
    const lookupScript = [
      `printf '${GITHUB_TOKEN_START_MARKER}%s${GITHUB_TOKEN_END_MARKER}\\n' "$GITHUB_TOKEN"`,
      `printf '${GH_TOKEN_START_MARKER}%s${GH_TOKEN_END_MARKER}\\n' "$GH_TOKEN"`,
    ].join("; ");

    const { stdout } = await execFileAsync(shell, ["-ilc", lookupScript], {
      encoding: "utf-8",
      timeout: SHELL_LOOKUP_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
    });

    return parseShellLookupOutput(stdout);
  } catch {
    return { githubToken: null, ghToken: null };
  }
}

async function readLocalToken(): Promise<string | null> {
  const direct = cleanToken(process.env.GITHUB_TOKEN) ?? cleanToken(process.env.GH_TOKEN);
  if (direct) {
    return direct;
  }

  const { githubToken, ghToken } = await readShellEnvTokens();
  return githubToken ?? ghToken;
}

interface ResolveCopilotAuthTokensResult {
  primaryToken: string | null;
  localToken: string | null;
  preferenceToken: string | null;
}

export async function resolveCopilotAuthTokens(
  options: { preferenceToken?: string } = {},
): Promise<ResolveCopilotAuthTokensResult> {
  const localToken = await readLocalToken();
  const preferenceToken = cleanToken(options.preferenceToken);

  return {
    primaryToken: localToken ?? preferenceToken,
    localToken,
    preferenceToken,
  };
}

export function shouldFallbackToPreferenceToken(options: {
  localToken: string | null;
  preferenceToken: string | null;
  errorType?: string;
}): boolean {
  return (
    options.errorType === "unauthorized" &&
    options.localToken !== null &&
    options.preferenceToken !== null &&
    options.localToken !== options.preferenceToken
  );
}
