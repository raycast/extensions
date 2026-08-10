import { execFile } from "child_process";
import { promisify } from "util";
import { readOpencodeAuthToken } from "../agents/opencode-auth";

/**
 * Auto-discover ZAI API key from multiple sources:
 * 1. Manual preference (if set) - overrides everything
 * 2. OpenCode auth.json (zai-coding-plan entry)
 * 3. Shell environment variables (ZAI_API_KEY / GLM_API_KEY)
 *
 * Raycast is a GUI app and does not inherit shell env vars from .zshrc/.bashrc.
 * We spawn a login shell to resolve them when needed.
 */

const execFileAsync = promisify(execFile);
const SHELL_LOOKUP_TIMEOUT_MS = 3000;
const ZAI_START_MARKER = "__ZAI_API_KEY_START__";
const ZAI_END_MARKER = "__ZAI_API_KEY_END__";
const GLM_START_MARKER = "__GLM_API_KEY_START__";
const GLM_END_MARKER = "__GLM_API_KEY_END__";

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

function parseShellLookupOutput(output: string): { zaiToken: string | null; glmToken: string | null } {
  return {
    zaiToken: extractMarkedValue(output, ZAI_START_MARKER, ZAI_END_MARKER),
    glmToken: extractMarkedValue(output, GLM_START_MARKER, GLM_END_MARKER),
  };
}

async function readShellEnvTokens(): Promise<{ zaiToken: string | null; glmToken: string | null }> {
  try {
    const shell = process.env.SHELL || "/bin/zsh";
    const lookupScript = [
      `printf '${ZAI_START_MARKER}%s${ZAI_END_MARKER}\\n' "$ZAI_API_KEY"`,
      `printf '${GLM_START_MARKER}%s${GLM_END_MARKER}\\n' "$GLM_API_KEY"`,
    ].join("; ");

    const { stdout } = await execFileAsync(shell, ["-ilc", lookupScript], {
      encoding: "utf-8",
      timeout: SHELL_LOOKUP_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
    });

    return parseShellLookupOutput(stdout);
  } catch {
    return { zaiToken: null, glmToken: null };
  }
}

async function readEnvToken(): Promise<string | null> {
  // 1. Check process.env directly (in case Raycast inherits it)
  const direct = cleanToken(process.env.ZAI_API_KEY) ?? cleanToken(process.env.GLM_API_KEY);
  if (direct) return direct;

  // 2. Spawn login shell once and read both vars to avoid duplicate process startup.
  const { zaiToken, glmToken } = await readShellEnvTokens();
  return zaiToken ?? glmToken;
}

interface ResolveZaiAuthTokensResult {
  primaryToken: string | null;
  localToken: string | null;
  preferenceToken: string | null;
  allTokens: string[]; // ordered list of all non-empty discovered tokens
}

export async function resolveZaiAuthTokens(
  options: { preferenceToken?: string; preferenceToken2?: string } = {},
): Promise<ResolveZaiAuthTokensResult> {
  const candidates: string[] = [];

  const pref1 = cleanToken(options.preferenceToken);
  if (pref1) candidates.push(pref1);

  // Auto-detect only when no primary preference override
  if (!pref1) {
    const opencodeToken = readOpencodeAuthToken("zai-coding-plan");
    const envToken = await readEnvToken();
    const localToken = opencodeToken ?? envToken;
    if (localToken) candidates.push(localToken);
  }

  // Append second preference token if provided and not already present
  const pref2 = cleanToken(options.preferenceToken2);
  if (pref2 && !candidates.includes(pref2)) {
    candidates.push(pref2);
  }

  const primaryToken = candidates[0] ?? null;
  const localToken = pref1 ? null : (candidates[0] ?? null);

  return {
    primaryToken,
    localToken,
    preferenceToken: pref1,
    allTokens: candidates,
  };
}
