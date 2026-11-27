import { constants } from "fs";
import { randomBytes } from "crypto";
import { access, chmod, mkdir, readdir, rm, stat, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { folderName, loadSnapshot, readSupportFile, supportFile } from "./snapshot";

/**
 * Lancetta's session wall (`sessions.json`, written by `SessionWall`): one post-it per Claude
 * Code or Codex session it has seen. Internal to the app, so read field by field and never
 * written: Done, Put Back and Rename stay in the app, which owns the file.
 *
 * Private: a note holds the session's name and its working folder.
 */
const SESSIONS_PATH = supportFile("sessions.json");

export type Note = {
  id: string;
  agent?: "claude" | "codex" | string;
  kind?: "background" | "interactive" | "other" | string;
  /** Claude Code's background session id, which `claude attach` takes. */
  room?: string;
  conversation?: string;
  /** A Codex thread, which `codex resume` takes. */
  thread?: string;
  name?: string;
  rename?: string;
  cwd?: string;
  /** working, finished, asking, failed, stopped, ended, removed, other. */
  status: string;
  state?: string;
  since?: string;
  firstSeen?: string;
  lastSeen?: string;
  started?: string;
  listed?: boolean;
  /** Seconds spent working, and waiting on the user. */
  worked?: number;
  waited?: number;
  doneAt?: string;
  doneBy?: string;
};

/** The wall's three columns. */
export type Column = "working" | "yourTurn" | "done";

export async function loadNotes(): Promise<Note[]> {
  const file = await readSupportFile(SESSIONS_PATH);
  if (!file) return [];
  const document = JSON.parse(file.text) as { schema?: number; notes?: unknown };
  return Array.isArray(document.notes) ? (document.notes as Note[]).filter((n) => n && typeof n.id === "string") : [];
}

/**
 * The wall, and when Lancetta last wrote `usage.json`: the wall is rewritten only when a note
 * changes, so its own age says nothing, while the usage document is rewritten at every poll.
 * Null when that document cannot be read; the wall is shown anyway.
 */
export async function loadWall(): Promise<{ notes: Note[]; writtenAt: number | null }> {
  const notes = await loadNotes();
  const writtenAt = await loadSnapshot().then(
    (s) => s.writtenAt,
    () => null,
  );
  return { notes, writtenAt };
}

export const agentOf = (note: Note) => (note.agent === "codex" ? "Codex" : "Claude");

export const titleOf = (note: Note) => note.rename || note.name || folderName(note.cwd) || note.id;

/** Working, or waiting on you, or done: what the user marked done, and what was removed or closed. */
export function columnOf(note: Note): Column {
  if (note.doneAt || note.status === "removed" || note.status === "ended") return "done";
  if (note.status === "working") return "working";
  return "yourTurn";
}

/**
 * When it entered the state it is in, or 0 when that is not known: Lancetta leaves `since`
 * empty for a session already in that state the first time it looked. Never `lastSeen`,
 * which the app refreshes at every listing and would read as "just now".
 */
export const changedAt = (note: Note) => Date.parse(note.since ?? "") || 0;

/** One column of the wall, latest change first (first seen, when the change is not known), up to `limit`; the notes passed in are left as they were. */
export const sessionsIn = (notes: Note[], column: Column, limit?: number) => {
  const order = (n: Note) => changedAt(n) || Date.parse(n.firstSeen ?? "") || 0;
  return notes
    .filter((n) => columnOf(n) === column)
    .sort((a, b) => order(b) - order(a))
    .slice(0, limit);
};

/** An id as the agents write them: what is safe to put on a command line unquoted or quoted. */
const identifier = (raw?: string) => (raw && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(raw) ? raw : undefined);

/** Quoted for zsh, as Lancetta quotes what it runs. */
const quoted = (text: string) => `'${text.replace(/'/g, `'\\''`)}'`;

/** A command that opens a session: the agent's binary, what follows it, and the folder to be in first. */
export type Opening = { binary: "claude" | "codex"; args: string; folder?: string };

/**
 * The command that opens a session in a terminal, as Lancetta's Open runs it: `claude attach`
 * for a background session still listed; `claude --resume` in its folder only once the
 * session is gone, never on one still running in its own terminal; `codex resume` for a Codex
 * thread that is not working. Null when none opens it.
 */
export function openCommand(note: Note): Opening | null {
  if (note.agent === "codex") {
    const thread = identifier(note.thread);
    if (!thread || note.status === "working") return null;
    return { binary: "codex", args: `resume${note.cwd ? ` -C ${quoted(note.cwd)}` : ""} ${quoted(thread)}` };
  }
  const room = identifier(note.room);
  if (room && note.listed) return { binary: "claude", args: `attach ${quoted(room)}` };
  const conversation = identifier(note.conversation);
  if (conversation && !note.listed)
    return { binary: "claude", args: `--resume ${quoted(conversation)}`, folder: note.cwd };
  return null;
}

/** What Copy puts on the clipboard: the folder first, when the command needs one. */
export const commandLine = (opening: Opening, binary: string = opening.binary) => {
  const command = `${binary === opening.binary ? binary : quoted(binary)} ${opening.args}`;
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
