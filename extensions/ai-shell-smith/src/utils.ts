import { runAppleScript } from "@raycast/utils";
import { execFile, spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type TerminalApp =
  | "Warp"
  | "iTerm2"
  | "Ghostty"
  | "WezTerm"
  | "Alacritty"
  | "Kitty"
  | "cmux"
  | "Terminal";

const CMUX_BINS = [
  "/Applications/cmux.app/Contents/Resources/bin/cmux",
  "/opt/homebrew/bin/cmux",
  "/usr/local/bin/cmux",
];

function isTerminalInstalled(terminal: TerminalApp): boolean {
  const paths: Record<TerminalApp, string[]> = {
    Warp: ["/Applications/Warp.app"],
    iTerm2: ["/Applications/iTerm.app", "/Applications/iTerm2.app"],
    Ghostty: ["/Applications/Ghostty.app"],
    WezTerm: ["/Applications/WezTerm.app"],
    Alacritty: ["/Applications/Alacritty.app"],
    Kitty: ["/Applications/Kitty.app"],
    cmux: CMUX_BINS,
    Terminal: [],
  };
  return paths[terminal].some((path) => existsSync(path));
}

function detectDefaultTerminal(): TerminalApp {
  // Check environment variable first (set by shells like zsh)
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase();
  if (termProgram === "iterm.app") return "iTerm2";
  if (termProgram === "wezterm") return "WezTerm";
  if (termProgram === "ghostty") return "Ghostty";
  if (termProgram === "warpterminal") return "Warp";

  // Check which terminals are installed (in preference order)
  const preferredTerminals: TerminalApp[] = [
    "Warp",
    "iTerm2",
    "Ghostty",
    "WezTerm",
    "Alacritty",
    "Kitty",
    "cmux",
  ];

  for (const terminal of preferredTerminals) {
    if (isTerminalInstalled(terminal)) {
      return terminal;
    }
  }

  // Fallback to Terminal.app (always available on macOS)
  return "Terminal";
}

// Apps without an AppleScript "run command" verb: open a new window and type
// the command. Keystrokes must target System Events — sent to the app itself
// they fail with "Can't get keystroke" (-1728). Values go in as argv, never
// into the script source.
async function typeIntoNewWindow(app: string, command: string): Promise<void> {
  await runAppleScript(
    `on run argv
      tell application (item 1 of argv) to activate
      delay 0.3
      tell application "System Events"
        keystroke "n" using command down
        delay 0.3
        keystroke (item 2 of argv)
        keystroke return
      end tell
    end run`,
    [app, command],
  );
}

// Warp's input editor swallows a synthetic Return, and its URI scheme can't
// run commands, so use a Tab Config (documented: docs.warp.dev, Tab Configs).
async function runInWarp(command: string): Promise<void> {
  const dir = join(homedir(), ".warp", "tab_configs");
  mkdirSync(dir, { recursive: true });
  // JSON string escapes are valid TOML basic-string escapes.
  writeFileSync(
    join(dir, "ai_shell_smith.toml"),
    `name = "AI Shell Smith"

[[panes]]
id = "main"
type = "terminal"
directory = ${JSON.stringify(homedir())}
commands = [${JSON.stringify(command)}]
`,
  );
  await execFileAsync("open", [
    "warp://tab_config/ai_shell_smith?new_window=true",
  ]);
}

async function runInITerm2(command: string): Promise<void> {
  await runAppleScript(
    `on run argv
      tell application "iTerm"
        activate
        create window with default profile
        tell current session of current window
          write text (item 1 of argv)
        end tell
      end tell
    end run`,
    [command],
  );
}

async function runInGhostty(command: string): Promise<void> {
  return typeIntoNewWindow("Ghostty", command);
}

async function runInWezTerm(command: string): Promise<void> {
  return typeIntoNewWindow("WezTerm", command);
}

async function runInAlacritty(command: string): Promise<void> {
  const bin = "/Applications/Alacritty.app/Contents/MacOS/alacritty";
  if (!existsSync(bin)) return runInTerminal(command);
  const child = spawn(bin, ["-e", "sh", "-c", command], {
    stdio: "ignore",
    detached: true,
  });
  child.unref();
}

async function runInKitty(command: string): Promise<void> {
  const bin = "/Applications/Kitty.app/Contents/MacOS/kitty";
  if (!existsSync(bin)) return runInTerminal(command);
  const child = spawn(bin, ["-e", "sh", "-c", command], {
    stdio: "ignore",
    detached: true,
  });
  child.unref();
}

async function runInCmux(command: string): Promise<void> {
  // Raycast's PATH has no Homebrew, so resolve the CLI by absolute path.
  const bin = CMUX_BINS.find((path) => existsSync(path));
  if (!bin) return runInTerminal(command);
  const args = ["new-workspace", "--command", command, "--focus", "true"];
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await execFileAsync(bin, args);
      return;
    } catch {
      // The CLI needs the app's socket: launch cmux once, then retry.
      if (attempt === 0)
        await execFileAsync("open", ["-a", "cmux"]).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return runInTerminal(command);
}

async function runInTerminal(command: string): Promise<void> {
  await runAppleScript(
    `on run argv
      tell application "Terminal"
        do script (item 1 of argv)
        activate
      end tell
    end run`,
    [command],
  );
}

export async function runCommandInDefaultTerminal(
  command: string,
  preferredTerminal?: string,
): Promise<void> {
  const terminal =
    preferredTerminal && preferredTerminal !== "auto"
      ? (preferredTerminal as TerminalApp)
      : detectDefaultTerminal();

  switch (terminal) {
    case "Warp":
      return runInWarp(command);
    case "iTerm2":
      return runInITerm2(command);
    case "Ghostty":
      return runInGhostty(command);
    case "WezTerm":
      return runInWezTerm(command);
    case "Alacritty":
      return runInAlacritty(command);
    case "Kitty":
      return runInKitty(command);
    case "cmux":
      return runInCmux(command);
    case "Terminal":
      return runInTerminal(command);
    default:
      return runInTerminal(command);
  }
}

/**
 * Runs the command in the user's login shell (Raycast's own PATH lacks
 * Homebrew & co.) without blocking the event loop. Throws on failure.
 */
export async function executeAndCaptureOutput(
  command: string,
): Promise<string> {
  const shell = process.env.SHELL || "/bin/zsh";
  const { stdout } = await execFileAsync(shell, ["-l", "-c", command], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  });
  return stdout.trim();
}
