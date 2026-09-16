import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createTerminal } from "./orca";
import { IS_WINDOWS, ORCA_BUNDLE_ID, SPAWN_ENV } from "./paths";
import { psCommand, psQuote, startProcess } from "./powershell";

const run = promisify(execFile);

const OPTS = { timeout: 8000, env: SPAWN_ENV } as const;

/**
 * How long a detached terminal is watched for an early death before it counts
 * as launched. A process that fails this way fails immediately — it is a stub
 * discovering the app behind it is absent — so this only has to outlast process
 * startup, and it is spent in front of a user waiting for a window.
 */
const DETACH_GRACE_MS = 600;

/**
 * The terminal that ships with the OS, and so the one choice that cannot be
 * missing. Its id is platform-neutral because what it resolves to is not:
 * Terminal.app on macOS, Windows PowerShell on Windows.
 */
export const SYSTEM_TERMINAL = "system";

/** The login shell to run the resume command under; see {@link loginShell}. */
const SHELL = process.env.SHELL || "/bin/zsh";

/** The terminal a session will be resumed in, once preferences are applied. */
export interface TerminalChoice {
  id: string;
  name: string;
  /** Orca alone can be asked which sessions it is already running. */
  isOrca: boolean;
}

export const ORCA_TERMINAL: TerminalChoice = {
  id: ORCA_BUNDLE_ID,
  name: "Orca",
  isOrca: true,
};

const shellQuote = (s: string) => `'${s.split("'").join(`'\\''`)}'`;

/** Escapes a string for embedding in an AppleScript double-quoted literal. */
const appleString = (s: string) => s.replace(/[\\"]/g, "\\$&");

/**
 * For terminals driven by AppleScript, which hand the text to a shell that is
 * already sitting in a window: the directory has to be reached with `cd`, and
 * the shell survives the command on its own.
 */
const script = (cwd: string, command: string) =>
  `cd ${shellQuote(cwd)} && ${command}`;

/**
 * For terminals that take the command as argv. Their window closes the moment
 * the command exits, so the shell is re-entered afterwards to leave the session
 * where the user can see what it printed. `-l` is what puts the agent binaries
 * on PATH: Raycast spawns us without a login environment.
 */
const loginShell = (command: string) => [
  SHELL,
  "-lc",
  `${command}; exec ${SHELL} -l`,
];

/**
 * The Windows counterpart of {@link loginShell}. `-NoExit` is what leaves the
 * window open afterwards, and it is also why these are launched detached rather
 * than awaited: the process outlives the command by design.
 */
const powershell = (cwd: string, command: string) => [
  "-NoExit",
  "-Command",
  `Set-Location -LiteralPath ${psQuote(cwd)}; ${command}`,
];

/**
 * Escapes every argument handed to `wt`, which splits its own command line on
 * unescaped semicolons *anywhere* in it — not only between subcommands — so an
 * unescaped one turns the rest of the line into a second, half-formed
 * subcommand. Both a directory name and a resume command can contain one, and
 * which argument it lands in makes no difference to wt, so all of them are
 * escaped rather than the one that happened to be suspect.
 */
const wtArgs = (args: string[]) => args.map((a) => a.replace(/;/g, "\\;"));

/**
 * Wraps a Windows console program in a launcher that gives it a console, and in
 * the error handling that makes a launch which did not happen visible. See
 * `powershell.ts` for both halves of why.
 */
const consoleLauncher = (exe: string, args: string[]) =>
  psCommand(startProcess(exe, args));

/**
 * What running a command in a terminal comes down to, kept as data so every
 * terminal's arguments and quoting are testable without launching anything —
 * which on the Windows half is the only way they are testable at all.
 */
export type LaunchPlan =
  | { kind: "orca" }
  | { kind: "osascript"; script: string }
  /** `open -n -b … --args …`: the app parses the command itself. */
  | { kind: "open"; args: string[] }
  /**
   * Windows: spawned detached and never awaited, since the process we start
   * outlives the command by design and awaiting it would hit our timeout and
   * kill the terminal we just opened.
   *
   * Nothing here is handed a console by us — see {@link consoleLauncher} — so a
   * plan is either a GUI program that opens its own window, or the launcher
   * that allocates a console for a console program.
   */
  | { kind: "detach"; exe: string; args: string[] };

type Driver = (cwd: string, command: string) => LaunchPlan;

/**
 * A terminal the preference offers, with the driver for each platform it exists
 * on. An entry with no driver for the running platform is offered but not
 * chosen — see {@link resolveTerminal} — since the manifest has no way to vary
 * a dropdown by platform.
 *
 * `package.json` repeats the ids and names as the dropdown's `data`, since a
 * manifest cannot import from here. `tests/terminal.test.ts` fails if the two
 * drift. Orca is the one entry with no driver at all: it is reached through its
 * own CLI rather than through a plan, and only ever on macOS.
 */
interface Terminal {
  id: string;
  name: string;
  macOS?: Driver;
  windows?: Driver;
}

/**
 * The terminal that every unresolvable choice falls back to, named apart from
 * the list so that having a driver on both platforms is a property of its type
 * rather than something looked up and null-checked at each use. Nothing else in
 * here is required to exist on both.
 */
const SYSTEM: Terminal & { macOS: Driver; windows: Driver } = {
  id: SYSTEM_TERMINAL,
  // Named for macOS, which is the only platform the manifest currently
  // declares. `systemTerminal` relabels it per platform at resolve time, so
  // widening `platforms` again is what makes the Windows name appear.
  name: "Terminal",
  macOS: (cwd, command) => ({
    kind: "osascript",
    script: `tell application "Terminal"\n  activate\n  do script "${appleString(script(cwd, command))}"\nend tell`,
  }),
  windows: (cwd, command) => ({
    kind: "detach",
    exe: "powershell.exe",
    args: consoleLauncher("powershell.exe", powershell(cwd, command)),
  }),
};

/**
 * The terminals the preference offers, in the order it offers them. Every one
 * of them is driveable on at least one platform, which is the point: an app
 * picker listing everything installed offers 1Password as somewhere to resume a
 * coding session.
 *
 * macOS ids are bundle ids and predate the Windows port; they are kept verbatim
 * so a preference chosen before it still resolves.
 */
export const TERMINALS: Terminal[] = [
  SYSTEM,
  {
    id: ORCA_BUNDLE_ID,
    name: "Orca",
    // A driver like any other, rather than a hole in the table and a matching
    // hole punched in each of its readers. Orca is reached through its own CLI
    // instead of a command line, so the plan carries no arguments — but having
    // it here is what lets `canDrive` and the invariant test behind it answer
    // from the data, and what keeps "macOS only" a fact of the table rather
    // than a condition repeated at every use.
    macOS: () => ({ kind: "orca" }),
  },
  {
    id: "com.mitchellh.ghostty",
    name: "Ghostty",
    macOS: (cwd, command) => ({
      kind: "open",
      args: [`--working-directory=${cwd}`, "-e", ...loginShell(command)],
    }),
  },
  {
    id: "com.github.wez.wezterm",
    name: "WezTerm",
    macOS: (cwd, command) => ({
      kind: "open",
      args: ["start", "--cwd", cwd, "--", ...loginShell(command)],
    }),
    windows: (cwd, command) => ({
      kind: "detach",
      exe: "wezterm-gui.exe",
      args: [
        "start",
        "--cwd",
        cwd,
        "--",
        "powershell.exe",
        ...powershell(cwd, command),
      ],
    }),
  },
  {
    id: "net.kovidgoyal.kitty",
    name: "Kitty",
    macOS: (cwd, command) => ({
      kind: "open",
      args: ["--directory", cwd, ...loginShell(command)],
    }),
  },
  {
    id: "org.alacritty",
    name: "Alacritty",
    macOS: (cwd, command) => ({
      kind: "open",
      args: ["--working-directory", cwd, "-e", ...loginShell(command)],
    }),
    windows: (cwd, command) => ({
      kind: "detach",
      exe: "alacritty.exe",
      args: [
        "--working-directory",
        cwd,
        "-e",
        "powershell.exe",
        ...powershell(cwd, command),
      ],
    }),
  },
  {
    id: "com.googlecode.iterm2",
    name: "iTerm",
    macOS: (cwd, command) => ({
      kind: "osascript",
      script: `tell application "iTerm"\n  activate\n  set w to (create window with default profile)\n  tell w's current session to write text "${appleString(script(cwd, command))}"\nend tell`,
    }),
  },
  {
    id: "windows-terminal",
    name: "Windows Terminal",
    // `-d` is already what puts the tab in the directory, so the `Set-Location`
    // prefix the other Windows drivers need would only add the one character wt
    // cannot be handed unescaped; the command goes in bare. See {@link wtArgs}
    // for why every argument is escaped rather than just the directory.
    windows: (cwd, command) => ({
      kind: "detach",
      exe: "wt.exe",
      args: wtArgs([
        "-d",
        cwd,
        "powershell.exe",
        "-NoExit",
        "-Command",
        command,
      ]),
    }),
  },
];

/** The driver `terminal` has on the running platform, if it has one. */
const driverFor = (terminal: Terminal, windows: boolean) =>
  windows ? terminal.windows : terminal.macOS;

/**
 * The terminal to resume in, from the id the user picked at install.
 *
 * Anything with no driver here falls to the system terminal rather than being
 * driven blind. That covers three cases with one rule: a preference that
 * outlived the list it was chosen from, Orca on Windows, and — the ordinary one
 * — an entry for the platform the user is not on, which the dropdown has no way
 * to hide from them.
 */
export function resolveTerminal(
  id?: string,
  windows = IS_WINDOWS,
): TerminalChoice {
  if (id === ORCA_BUNDLE_ID && !windows) return ORCA_TERMINAL;
  const known = TERMINALS.find((t) => t.id === id && driverFor(t, windows));
  // The system entry is re-fetched rather than used as found, so that its name
  // is the one terminal the user will actually see rather than the dropdown
  // label naming both platforms.
  const chosen =
    known && known.id !== SYSTEM_TERMINAL ? known : systemTerminal(windows);
  return { id: chosen.id, name: chosen.name, isOrca: false };
}

// The dropdown label names both platforms; a toast naming the wrong one would
// be worse than naming neither.
const systemTerminal = (windows: boolean): Terminal => ({
  ...SYSTEM,
  name: windows ? "PowerShell" : "Terminal",
});

/** How `choice` would be asked to run `command` in `cwd`. */
export function launchPlan(
  choice: TerminalChoice,
  cwd: string,
  command: string,
  windows = IS_WINDOWS,
): LaunchPlan {
  const terminal = TERMINALS.find((t) => t.id === choice.id);
  // SYSTEM is reached through the constant rather than through the list, so the
  // fallback driver is one the type guarantees exists on both platforms.
  const driver =
    (terminal && driverFor(terminal, windows)) ??
    (windows ? SYSTEM.windows : SYSTEM.macOS);
  const plan = driver(cwd, command);
  // Only macOS needs the app named separately from the command, `open` being a
  // launcher rather than the program; a Windows plan already names its exe.
  return plan.kind === "open"
    ? { kind: "open", args: ["-n", "-b", choice.id, "--args", ...plan.args] }
    : plan;
}

/** Whether `id` is one we know how to hand a command to on this platform. */
export function canDrive(id: string, windows = IS_WINDOWS): boolean {
  return TERMINALS.some((t) => t.id === id && driverFor(t, windows));
}

async function execute(plan: LaunchPlan): Promise<void> {
  switch (plan.kind) {
    case "orca":
      throw new Error("the Orca plan is executed by the caller");
    case "osascript":
      await run("/usr/bin/osascript", ["-e", plan.script], OPTS);
      return;
    case "open":
      await run("/usr/bin/open", plan.args, OPTS);
      return;
    case "detach": {
      const child = spawn(plan.exe, plan.args, {
        detached: true,
        stdio: "ignore",
        env: SPAWN_ENV,
        windowsHide: false,
      });
      await new Promise<void>((resolve, reject) => {
        // A process still alive when the grace elapses has opened its window, or
        // is a launcher still opening one; either way it is a success. The timer
        // is declared first so nothing can read it before it exists — a timer
        // cannot fire during this callback, whereas an emitter's listener is
        // only asynchronous by convention.
        const grace = setTimeout(() => settle(), DETACH_GRACE_MS);
        const settle = (error?: Error) => {
          clearTimeout(grace);
          if (error) reject(error);
          else resolve();
        };
        // Failures arrive on the emitter rather than as a rejection. ENOENT is
        // synchronous — the exe is looked up in this process — so a terminal
        // that is not installed at all rejects at once. The listener stays
        // attached afterwards so a late error still finds a handler; rejecting
        // a settled promise is a no-op.
        child.on("error", settle);
        // Starting is not the same as running: `wt.exe` is an App Execution
        // Alias stub that spawns cleanly and exits non-zero when Windows
        // Terminal is not installed, and the PowerShell launcher exits non-zero
        // when Start-Process cannot start its target. Reporting either as a
        // launched terminal closes the Raycast window over nothing at all.
        child.on("exit", (code) =>
          settle(
            code
              ? new Error(`${plan.exe} exited with code ${code}`)
              : undefined,
          ),
        );
        // Unref'd whichever way this ends: nothing here is ever waited on, and
        // the terminal has to outlive the Raycast command that opened it.
        child.once("spawn", () => child.unref());
      });
      return;
    }
  }
}

/**
 * Start `command` in `cwd`, in the chosen terminal where that is possible and
 * in the system terminal where it is not.
 *
 * A terminal that was uninstalled since it was picked, or an Orca CLI that is
 * not on PATH, lands in Terminal.app or PowerShell rather than failing. Only a
 * failure of that last one, which ships with the OS, reaches the caller, and
 * the caller still has the clipboard.
 */
export async function resumeInTerminal(
  choice: TerminalChoice,
  cwd: string,
  command: string,
  windows = IS_WINDOWS,
): Promise<string> {
  try {
    if (choice.isOrca) await createTerminal(cwd, command);
    else await execute(launchPlan(choice, cwd, command, windows));
    return choice.name;
  } catch (e) {
    if (choice.id === SYSTEM_TERMINAL) throw e;
    const system = resolveTerminal(SYSTEM_TERMINAL, windows);
    await execute(launchPlan(system, cwd, command, windows));
    return system.name;
  }
}
