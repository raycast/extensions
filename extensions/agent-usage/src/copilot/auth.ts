import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SHELL_LOOKUP_TIMEOUT_MS = 3000;
const GITHUB_TOKEN_START_MARKER = "__GITHUB_TOKEN_START__";
const GITHUB_TOKEN_END_MARKER = "__GITHUB_TOKEN_END__";
const GH_TOKEN_START_MARKER = "__GH_TOKEN_START__";
const GH_TOKEN_END_MARKER = "__GH_TOKEN_END__";

function cleanToken(token: string | null | undefined): string | null {
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
  const githubToken = extractMarkedValue(output, GITHUB_TOKEN_START_MARKER, GITHUB_TOKEN_END_MARKER);
  const ghToken = extractMarkedValue(output, GH_TOKEN_START_MARKER, GH_TOKEN_END_MARKER);

  return {
    githubToken: githubToken === "%GITHUB_TOKEN%" ? null : githubToken,
    ghToken: ghToken === "%GH_TOKEN%" ? null : ghToken,
  };
}

async function readShellEnvTokens(): Promise<{ githubToken: string | null; ghToken: string | null }> {
  try {
    const shell = process.env.SHELL || (process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "/bin/zsh");
    const shellName = shell.replaceAll("\\", "/").split("/").pop()?.toLowerCase() ?? "";
    const isCommandShell = shellName === "cmd.exe" || shellName.endsWith(".cmd") || shellName.endsWith(".bat");
    const lookupScript = isCommandShell
      ? `echo ${GITHUB_TOKEN_START_MARKER}!GITHUB_TOKEN!${GITHUB_TOKEN_END_MARKER} & echo ${GH_TOKEN_START_MARKER}!GH_TOKEN!${GH_TOKEN_END_MARKER}`
      : [
          `printf '${GITHUB_TOKEN_START_MARKER}%s${GITHUB_TOKEN_END_MARKER}\\n' "$GITHUB_TOKEN"`,
          `printf '${GH_TOKEN_START_MARKER}%s${GH_TOKEN_END_MARKER}\\n' "$GH_TOKEN"`,
        ].join("; ");
    const shellArgs = isCommandShell ? ["/d", "/v:on", "/s", "/c", lookupScript] : ["-ilc", lookupScript];
    const isBatchShell = shellName.endsWith(".cmd") || shellName.endsWith(".bat");
    const executable = isBatchShell ? process.env.ComSpec || "cmd.exe" : shell;
    const executableArgs = isBatchShell ? ["/d", "/v:on", "/c", `call "${shell}" & ${lookupScript}`] : shellArgs;

    const { stdout } = await execFileAsync(executable, executableArgs, {
      encoding: "utf-8",
      timeout: SHELL_LOOKUP_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
      windowsVerbatimArguments: isCommandShell,
    });

    return parseShellLookupOutput(stdout);
  } catch {
    return { githubToken: null, ghToken: null };
  }
}

async function readGhCliToken(): Promise<string | null> {
  try {
    const env = { ...process.env };
    delete env.GITHUB_TOKEN;
    delete env.GH_TOKEN;
    const { stdout } = await execFileAsync("gh", ["auth", "token"], {
      encoding: "utf-8",
      timeout: SHELL_LOOKUP_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
      env,
    });
    return cleanToken(stdout);
  } catch {
    return null;
  }
}

export interface CopilotAuthTokens {
  cliToken: string | null;
  githubToken: string | null;
  ghToken: string | null;
}

export async function resolveCopilotAuthTokens(
  options: { readGhToken?: () => Promise<string | null> } = {},
): Promise<CopilotAuthTokens> {
  const cliToken = cleanToken(await (options.readGhToken ?? readGhCliToken)());
  if (cliToken) {
    return { cliToken, githubToken: null, ghToken: null };
  }

  const directGithubToken = cleanToken(process.env.GITHUB_TOKEN);
  const directGhToken = cleanToken(process.env.GH_TOKEN);
  if (directGithubToken && directGhToken) {
    return { cliToken: null, githubToken: directGithubToken, ghToken: directGhToken };
  }

  const { githubToken, ghToken } = await readShellEnvTokens();

  return {
    cliToken: null,
    githubToken: directGithubToken ?? githubToken,
    ghToken: directGhToken ?? ghToken,
  };
}
