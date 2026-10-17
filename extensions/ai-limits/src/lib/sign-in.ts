import { Deps, RunResult } from "./deps";
import { STATE_DB, TOKEN_QUERY } from "./providers/cursor";

// Connect runs each tool's own sign-in. Nothing here imports Raycast, so the helpers are tested with fakeDeps.

// The first time, macOS asks whether Raycast may control Terminal, and that answer can take a while.
const OSASCRIPT = "/usr/bin/osascript";
const OSASCRIPT_TIMEOUT_MS = 60_000;

// A marker around each value the login shell prints, so text an interactive shell prints before them (a banner, a
// greeting) is ignored. The values are the PATH, then CLAUDE_CONFIG_DIR and CODEX_HOME.
const MARKER = "__AI_LIMITS__";
const ENV_PATTERN = new RegExp(`${MARKER}(.*?)${MARKER}(.*?)${MARKER}(.*?)${MARKER}`, "s");
const PRINT_FORMAT = `${MARKER}%s${MARKER}%s${MARKER}%s${MARKER}`;
const ENV_COMMAND = `printf "${PRINT_FORMAT}" "$PATH" "$CLAUDE_CONFIG_DIR" "$CODEX_HOME"`;
// Fish stores PATH as a list, and "$PATH" would join its entries with spaces, so they are joined with colons here. An
// unset variable expands to nothing inside double quotes in fish too.
const FISH_ENV_COMMAND = `printf "${PRINT_FORMAT}" (string join : $PATH) "$CLAUDE_CONFIG_DIR" "$CODEX_HOME"`;
// Shells that accept the -ilc form used below. Anything else, or a relative SHELL, falls back to zsh, the macOS default.
const KNOWN_SHELL = /^\/(?:.*\/)?(bash|zsh|fish|sh)$/;
const DEFAULT_SHELL = "/bin/zsh";

// Where Homebrew puts its commands, plus the system directories. A minimal PATH often leaves these out.
const WELL_KNOWN_DIRS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];

// Where the Gemini CLI keeps its login. gemini.ts reads the same file.
const GEMINI_CREDENTIALS = ".gemini/oauth_creds.json";

// The sign-in each CLI runs in Terminal, and where to get the CLI when it isn't installed. `name` is what
// findExecutable looks for.
export const CLI_SIGN_IN = {
  claude: { name: "claude", args: ["auth", "login"], installUrl: "https://code.claude.com/docs/en/setup" },
  codex: { name: "codex", args: ["login"], installUrl: "https://developers.openai.com/codex/cli" },
} as const;

export const CURSOR_BUNDLE_ID = "com.todesktop.230313mzl4w4u92";

// What the user's shell sets for the CLIs. Each folder has three states, which Connect saves as they are: a path when
// the shell sets it, "" when the shell answered and doesn't set it (so a folder saved before is cleared), and undefined
// when the shell couldn't be asked (so a folder saved before is kept).
export interface UserEnv {
  // The PATH a Terminal window on this Mac would have.
  path: string;
  claudeConfigDir?: string;
  codexHome?: string;
}

// The PATH a Terminal window on this Mac would have, and the config folders the user's shell sets. Raycast starts
// extensions with a minimal PATH, which leaves out Homebrew and npm installs, and its environment rarely has
// CLAUDE_CONFIG_DIR or CODEX_HOME. So the login shell is asked for all three. When that fails, the process PATH is
// used and both folders are undefined, so nothing saved is changed and the extension's own environment decides.
export async function resolveUserEnv(deps: Deps): Promise<UserEnv> {
  const shell = await loginShellValues(deps);
  const parts = [...(shell?.path ?? deps.env.PATH ?? "").split(":"), `${deps.homedir}/.local/bin`, ...WELL_KNOWN_DIRS];
  // An empty entry would mean the current directory, so it is dropped. The Set keeps the first copy of each entry, so a
  // directory the login shell already lists keeps its place and the well-known ones are only added when missing.
  return {
    path: [...new Set(parts.filter((part) => part !== ""))].join(":"),
    claudeConfigDir: shell?.claudeConfigDir,
    codexHome: shell?.codexHome,
  };
}

interface LoginShellValues {
  path: string;
  claudeConfigDir: string;
  codexHome: string;
}

// Returns what the login shell prints between the markers, or undefined when the shell fails or prints no markers, so
// the caller can fall back. The folders are trimmed, so an empty one means the shell doesn't set it.
async function loginShellValues(deps: Deps): Promise<LoginShellValues | undefined> {
  const shell = loginShell(deps.env.SHELL);
  const command = shell.endsWith("/fish") ? FISH_ENV_COMMAND : ENV_COMMAND;
  try {
    const result = await deps.run(shell, ["-ilc", command], { timeoutMs: 5_000 });
    if (result.exitCode !== 0) {
      return undefined;
    }
    const match = ENV_PATTERN.exec(result.stdout);
    return match ? { path: match[1], claudeConfigDir: match[2].trim(), codexHome: match[3].trim() } : undefined;
  } catch {
    return undefined;
  }
}

function loginShell(shell: string | undefined): string {
  return shell && KNOWN_SHELL.test(shell) ? shell : DEFAULT_SHELL;
}

// The first directory in `path` that holds an executable called `name`, or undefined. Claude Code's older installer put
// its binary in ~/.claude/local, which isn't on PATH, so that place is checked after PATH.
export async function findExecutable(deps: Deps, name: string, path: string): Promise<string | undefined> {
  const candidates = path
    .split(":")
    .filter((dir) => dir !== "")
    .map((dir) => `${dir}/${name}`);
  if (name === "claude") {
    candidates.push(`${deps.homedir}/.claude/local/claude`);
  }
  for (const candidate of candidates) {
    if (await deps.isExecutable(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

// Opens a new Terminal window and runs argv (the executable first) in it. The sign-in runs in Terminal rather than as
// a child of Raycast, because Raycast stops a hidden command after a while, and that would end a sign-in still waiting
// for the browser. Terminal's shell also has the PATH from the user's shell files, and the CLI keeps running after this
// returns. Config folders such as CLAUDE_CONFIG_DIR are passed to the CLI by connect.ts, so the login is written where
// the extension reads it, whatever Terminal's shell sets.
export async function openInTerminal(deps: Deps, argv: string[]): Promise<void> {
  const command = argv.map(shellQuote).join(" ");
  // Backslashes are escaped first, so the ones added for the quotes aren't escaped again.
  const escaped = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = ['tell application "Terminal"', "activate", `do script "${escaped}"`, "end tell"].join("\n");

  let result: RunResult;
  try {
    result = await deps.run(OSASCRIPT, ["-e", script], { timeoutMs: OSASCRIPT_TIMEOUT_MS });
  } catch {
    // The error from a run that fails would include the script, so the message is written here instead.
    throw new Error("Couldn't open Terminal (osascript didn't finish)");
  }
  if (result.exitCode === 0) {
    return;
  }
  // -1743 is the error macOS gives when the Automation permission for Terminal is refused.
  if (result.stderr.includes("-1743")) {
    throw new Error(
      "Raycast isn't allowed to control Terminal. Allow it in System Settings > Privacy & Security > Automation.",
    );
  }
  throw new Error(`Couldn't open Terminal (osascript exit ${result.exitCode})`);
}

// Quotes one argument for a POSIX shell. Inside single quotes only the single quote is special, so each one is closed,
// escaped and reopened.
function shellQuote(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

// Launches an app by its bundle id. `open` exits non-zero when the app isn't installed, which is reported as false.
export async function openApp(deps: Deps, bundleId: string): Promise<boolean> {
  try {
    const result = await deps.run("/usr/bin/open", ["-b", bundleId]);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

// Polls `check` until it passes, the timeout runs out or `signal` aborts. A check that throws counts as not yet. The
// clock and sleep are passed in so tests can run without waiting.
export async function waitFor(
  check: () => Promise<boolean>,
  options: {
    intervalMs: number;
    timeoutMs: number;
    now: () => number;
    sleep?: (ms: number) => Promise<void>;
    signal?: AbortSignal;
  },
): Promise<boolean> {
  const { intervalMs, timeoutMs, now, signal } = options;
  const sleep = options.sleep ?? ((ms: number) => defaultSleep(ms, signal));
  const deadline = now() + timeoutMs;
  while (!signal?.aborted) {
    if (await passes(check)) {
      return true;
    }
    const remaining = deadline - now();
    if (remaining <= 0) {
      return false;
    }
    // The last wait stops at the deadline, so the timeout isn't overshot by a whole interval.
    await sleep(Math.min(intervalMs, remaining));
  }
  return false;
}

async function passes(check: () => Promise<boolean>): Promise<boolean> {
  try {
    return await check();
  } catch {
    return false;
  }
}

// Waits `ms`, or less when `signal` aborts, so a stopped Connect doesn't keep its wait running. The abort listener is
// removed once the wait ends, so a signal that lives on doesn't collect listeners.
function defaultSleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener("abort", finish, { once: true });
  });
}

// Codex's login file as text. It lives in the CODEX_HOME folder when there is one, the same folder codex.ts reads, and
// in ~/.codex otherwise. The caller passes the folder in. Connect compares the text before and after a sign-in, so a
// login that was replaced can be told apart from the old one.
export async function readCodexLogin(deps: Deps, codexHome: string | undefined): Promise<string | null> {
  return readText(deps, `${codexHome || `${deps.homedir}/.codex`}/auth.json`);
}

export async function readGeminiLogin(deps: Deps): Promise<string | null> {
  return readText(deps, `${deps.homedir}/${GEMINI_CREDENTIALS}`);
}

// The login token the Cursor app keeps in its state database. A missing or unreadable database means no login.
export async function readCursorLogin(deps: Deps): Promise<string | null> {
  try {
    const token = (await deps.sqlite(deps.homedir + STATE_DB, TOKEN_QUERY)).trim();
    return token === "" ? null : token;
  } catch {
    return null;
  }
}

// Deps has no existence check, so a read stands in for one. A read error counts as not there.
async function readText(deps: Deps, path: string): Promise<string | null> {
  try {
    return await deps.readFile(path);
  } catch {
    return null;
  }
}
