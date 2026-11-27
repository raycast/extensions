import { constants } from "fs";
import { randomBytes } from "crypto";
import { access, chmod, mkdir, readdir, rm, stat, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { lancettaExport } from "./lancetta";
import { folderName, loadSnapshot } from "./snapshot";

/**
 * `Lancetta sessions --json`: the wall as the app shows it, what waits on you, what is working
 * and what is concluded, each with the command that opens it. The app decides the column and
 * what opens a session; this only reads. Done, Put Back and Rename stay in the app.
 *
 * Private: a session's title and working folder are on this Mac only.
 */
export type Session = {
  id: string;
  /** `claude` or `codex`. */
  agent: string;
  /** `background`, `interactive` or `other`. */
  kind: string;
  column: Column;
  /** working, finished, asking, failed, stopped, ended, removed, other; null for a concluded one. */
  status: string | null;
  title: string | null;
  cwd: string | null;
  /** Unix seconds. */
  started: number;
  since: number | null;
  /** Seconds spent working, and waiting on the user. */
  worked: number | null;
  waited: number | null;
  doneAt: number | null;
  /** `user`, `removal` or `closed`. */
  doneBy: string | null;
  room: string | null;
  conversation: string | null;
  thread: string | null;
  opening: { binary: "claude" | "codex"; arguments: string; folder: string | null; line: string } | null;
  /** Why none opens it: `working`, `ownTerminal`, `notListed` or `noID`. */
  opensNot: string | null;
};

type SessionsDocument = { schema: number; asOf: number; sessions: Session[] };

/** The wall's three columns. */
export type Column = "working" | "yourTurn" | "done";

export async function loadNotes(): Promise<Session[]> {
  return (await lancettaExport<SessionsDocument>(["sessions"])).sessions;
}

/**
 * The wall, and when Lancetta last wrote `usage.json`: the wall is as old as the app's last
 * look, while the usage document is rewritten at every poll. Null when that document cannot be
 * read; the wall is shown anyway.
 */
export async function loadWall(): Promise<{ notes: Session[]; writtenAt: number | null }> {
  const [notes, writtenAt] = await Promise.all([
    loadNotes(),
    loadSnapshot().then(
      (s) => s.writtenAt,
      () => null,
    ),
  ]);
  return { notes, writtenAt };
}

export const agentOf = (note: Session) => (note.agent === "codex" ? "Codex" : "Claude");

export const titleOf = (note: Session) => note.title || folderName(note.cwd) || note.id;

/** Working, or waiting on you, or done: the app's own wall and its Concluded list. */
export const columnOf = (note: Session): Column => note.column;

/**
 * When it entered the state it is in, or 0 when that is not known: Lancetta leaves `since`
 * empty for a session already in that state the first time it looked. Milliseconds, as a Date takes them.
 */
export const changedAt = (note: Session) => (note.since ?? 0) * 1000;

/** One column of the wall, latest change first (when it started, when the change is not known), up to `limit`; the notes passed in are left as they were. */
export const sessionsIn = (notes: Session[], column: Column, limit?: number) => {
  const order = (n: Session) => changedAt(n) || (n.doneAt ?? n.started) * 1000;
  return notes
    .filter((n) => columnOf(n) === column)
    .sort((a, b) => order(b) - order(a))
    .slice(0, limit);
};

/** Quoted for zsh, as Lancetta quotes what it runs. */
const quoted = (text: string) => `'${text.replace(/'/g, `'\\''`)}'`;

/** A command that opens a session: the agent's binary, what follows it (already quoted), and the folder to be in first. */
export type Opening = NonNullable<Session["opening"]>;

/** The command that opens a session in a terminal, as Lancetta's Open runs it; null when none does (`opensNot` says why). */
export const openCommand = (note: Session): Opening | null => note.opening;

/** What Copy puts on the clipboard: the folder first, when the command needs one. */
export const commandLine = (opening: Opening, binary: string = opening.binary) => {
  const command = `${binary === opening.binary ? binary : quoted(binary)} ${opening.arguments}`;
  return opening.folder ? `cd ${quoted(opening.folder)} && ${command}` : command;
};

/**
 * Where the agent's binary is, looked for where Lancetta looks (`AgentBinary`, and Claude Code's
 * own installer first for `claude`): a login shell reads `.zprofile` but not `.zshrc`, where
 * `~/.local/bin` is often put on the PATH. The bare name, for the shell to find, when none is there.
 */
async function locate(binary: Opening["binary"]): Promise<string> {
  const home = homedir();
  const homebrew = ["/opt/homebrew/bin", "/usr/local/bin"];
  const own = binary === "claude" ? [`${home}/.local/bin`, `${home}/.claude/local`] : [`${home}/.local/bin`];
  const folders = [
    ...(binary === "claude" ? [...own, ...homebrew] : [...homebrew, ...own]),
    `${home}/.${binary}/bin`,
    `${home}/.bun/bin`,
    `${home}/.volta/bin`,
    "/opt/local/bin",
  ];
  for (const folder of folders) {
    const path = join(folder, binary);
    try {
      await access(path, constants.X_OK);
      return path;
    } catch {
      // not here
    }
  }
  return binary;
}

/** Scripts written for an opening, swept once they are this old: a terminal that never ran one leaves it behind. */
const SCRIPT_TTL_MS = 10 * 60 * 1000;

/**
 * A `.command` script that runs the opening in a login shell, through the binary's full path;
 * when none was found, in an interactive one too, so the PATH `.zshrc` sets finds it. One file
 * per opening, which removes itself as it starts: two quick openings never read each other's.
 * Opened with the chosen terminal app.
 */
export async function writeOpenScript(supportPath: string, opening: Opening) {
  await mkdir(supportPath, { recursive: true });
  await sweepScripts(supportPath);
  const file = join(supportPath, `open-session-${Date.now()}-${randomBytes(4).toString("hex")}.command`);
  const binary = await locate(opening.binary);
  const shell = binary === opening.binary ? "#!/bin/zsh -il" : "#!/bin/zsh -l";
  await writeFile(file, `${shell}\nrm -f -- "$0"\n${commandLine(opening, binary)}\n`, "utf8");
  await chmod(file, 0o755);
  return file;
}

async function sweepScripts(supportPath: string) {
  const now = Date.now();
  for (const name of await readdir(supportPath)) {
    if (!/^open-session.*\.command$/.test(name)) continue;
    const path = join(supportPath, name);
    try {
      if (now - (await stat(path)).mtimeMs > SCRIPT_TTL_MS) await rm(path, { force: true });
    } catch {
      // gone already
    }
  }
}
