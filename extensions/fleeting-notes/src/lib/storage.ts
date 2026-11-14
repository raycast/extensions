import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export type Pad = { text: string; updatedAt: string | null };
export type ScratchpadState = { version: 1; revision: number; current: Pad; previous: Pad | null };
export const MAX_TEXT_BYTES = 1024 * 1024;

function emptyState(): ScratchpadState {
  return { version: 1, revision: 0, current: { text: "", updatedAt: null }, previous: null };
}

function isPad(value: unknown): value is Pad {
  if (!value || typeof value !== "object") return false;
  const pad = value as Partial<Pad>;
  return typeof pad.text === "string" && (pad.updatedAt === null || typeof pad.updatedAt === "string");
}

export function parseState(raw: string): ScratchpadState {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object")
    throw new Error("The saved scratchpad is invalid. It has been left untouched.");
  const state = value as Partial<ScratchpadState>;
  if (
    state.version !== 1 ||
    !Number.isSafeInteger(state.revision) ||
    (state.revision ?? -1) < 0 ||
    !isPad(state.current) ||
    (state.previous !== null && !isPad(state.previous))
  ) {
    throw new Error("The saved scratchpad has an unsupported or invalid format. It has been left untouched.");
  }
  return state as ScratchpadState;
}

function acquireLock(path: string): number {
  // Every writer passes this gate, so two recoveries cannot remove each other's
  // replacement save lock. An abandoned gate deliberately fails closed.
  const gatePath = `${path}.gate`;
  let gate: number;
  try {
    gate = openSync(gatePath, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    throw new Error(
      "Another save or recovery is in progress. Retry shortly. If this persists, copy your text, quit Raycast, and remove scratchpad.lock.gate from the storage folder before reopening.",
    );
  }
  let lock: number | undefined;
  try {
    try {
      lock = openSync(path, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const owner = Number(readFileSync(path, "utf8"));
      let stale = false;
      if (Number.isSafeInteger(owner) && owner > 0) {
        try {
          process.kill(owner, 0);
        } catch (probeError) {
          stale = (probeError as NodeJS.ErrnoException).code === "ESRCH";
        }
      } else {
        // A worker can exit between lock creation and recording its process ID.
        stale = Date.now() - statSync(path).mtimeMs > 30_000;
      }
      if (!stale) throw new Error("Another scratchpad save is in progress. Copy your text and retry shortly.");
      unlinkSync(path);
      lock = openSync(path, "wx", 0o600);
    }
    writeFileSync(lock, String(process.pid), "utf8");
    return lock;
  } catch (error) {
    if (lock !== undefined) {
      closeSync(lock);
      unlinkSync(path);
    }
    throw error;
  } finally {
    closeSync(gate);
    unlinkSync(gatePath);
  }
}

/** Synchronous atomic writes finish before Raycast can unload the editor worker. */
export class ScratchpadStore {
  readonly path: string;

  constructor(readonly directory: string) {
    this.path = join(directory, "scratchpad-v1.json");
  }

  read(): ScratchpadState {
    if (!existsSync(this.path)) return emptyState();
    return parseState(readFileSync(this.path, "utf8"));
  }

  private commit(expectedRevision: number, change: (state: ScratchpadState) => ScratchpadState): ScratchpadState {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const lockPath = join(this.directory, "scratchpad.lock");
    const lock = acquireLock(lockPath);
    let temporaryPath: string | undefined;
    try {
      const current = this.read();
      if (current.revision !== expectedRevision) {
        throw new Error("The scratchpad changed in another command. Copy your text and reopen to load that version.");
      }
      const next = change(current);
      if (next === current) return current;
      next.revision = current.revision + 1;
      temporaryPath = join(this.directory, `scratchpad-${randomUUID()}.tmp`);
      writeFileSync(temporaryPath, JSON.stringify(next), { encoding: "utf8", mode: 0o600, flag: "wx" });
      renameSync(temporaryPath, this.path);
      temporaryPath = undefined;
      return next;
    } finally {
      if (temporaryPath && existsSync(temporaryPath)) unlinkSync(temporaryPath);
      closeSync(lock);
      unlinkSync(lockPath);
    }
  }

  save(text: string, expectedRevision: number): ScratchpadState {
    if (Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) {
      throw new Error("This scratchpad is limited to 1 MB. Copy or export your text before starting a fresh pad.");
    }
    return this.commit(expectedRevision, (state) => {
      if (state.current.text === text) return state;
      return { ...state, current: { text, updatedAt: new Date().toISOString() } };
    });
  }

  startNew(expectedRevision: number): ScratchpadState {
    return this.commit(expectedRevision, (state) => {
      if (!state.current.text) return state;
      return { ...state, previous: state.current, current: { text: "", updatedAt: null } };
    });
  }

  restorePrevious(expectedRevision: number): ScratchpadState {
    return this.commit(expectedRevision, (state) => {
      if (state.previous === null) return state;
      return { ...state, current: state.previous, previous: state.current };
    });
  }
}

export function appendText(current: string, addition: string): string {
  if (!addition) return current;
  return current ? `${current}${current.endsWith("\n") ? "" : "\n"}${addition}` : addition;
}
