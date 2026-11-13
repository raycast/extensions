import { getPreferenceValues } from "@raycast/api";
import { execFileSync } from "child_process";
import { homedir } from "os";
import { join, dirname } from "path";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  watchFile,
  unwatchFile,
  existsSync,
  openSync,
  closeSync,
  unlinkSync,
  statSync,
  utimesSync,
} from "fs";

export type Item = {
  id: string;
  label: string;
  text: string;
  ts: number;
  pinned?: boolean;
  // Optional provenance ("project · session8") set by pushers that send it.
  source?: string;
};

/**
 * The shelf has two backends and one interface.
 *
 * Local (the default): snippets live in ~/.ten-four.json, written by the
 * `tenfour` CLI on this Mac. Zero setup.
 *
 * Remote: set the Shelf URL preference to a shelf service endpoint and the
 * extension talks to it over HTTP instead, so snippets pushed from another
 * machine (a dev box, a container, Claude Code on a server) land here.
 */
export type Shelf = {
  isRemote: boolean;
  /** Where snippets are read from, for display in errors and empty states. */
  origin: string;
  load(): Promise<Item[]>;
  /** Call onChange whenever the store may have changed; returns an unwatcher. */
  watch(onChange: () => void): () => void;
  setPinned(item: Item, pinned: boolean): Promise<void>;
  remove(item: Item): Promise<void>;
  clear(): Promise<void>;
};

const LOCAL_FILE =
  process.env.TENFOUR_FILE || join(homedir(), ".ten-four.json");
const LOCK_FILE = `${LOCAL_FILE}.lock`;
const LOCK_STALE_MS = 2000;
const PID_ONLY_STALE_MS = 30000;
const WATCH_MS = 400;
const POLL_MS = 1000;

function readLocal(): Item[] {
  try {
    const data = JSON.parse(readFileSync(LOCAL_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    // No file yet, or a half-written one mid-push. Either way, nothing to show.
    return [];
  }
}

function writeLocal(items: Item[]) {
  mkdirSync(dirname(LOCAL_FILE), { recursive: true });
  // Write then rename, which is atomic within a directory. The CLI pushes to
  // this same file, and the list polls it, so a plain write would let a reader
  // catch a half-written file and see an empty shelf. Rename does not make
  // read-modify-write atomic across processes; withLock around the whole
  // mutation does that.
  const tmp = `${LOCAL_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(items, null, 2));
  renameSync(tmp, LOCAL_FILE);
}

function processStartTime(pid: number): string | null {
  try {
    return (
      execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}

function lockToken(): string {
  const startedAt = processStartTime(process.pid);
  return JSON.stringify({
    pid: process.pid,
    fingerprint: startedAt !== null,
    // Do not reclaim a live lock if `ps` is temporarily unavailable.
    pidOnly: startedAt === null,
    startedAt,
    token: Math.random().toString(36).slice(2),
  });
}

function lockOwner(token: string): {
  pid: number;
  fingerprint: boolean;
  pidOnly: boolean;
  startedAt: string | null;
} {
  try {
    const { pid, fingerprint, pidOnly, startedAt } = JSON.parse(token) as {
      pid: unknown;
      fingerprint: unknown;
      pidOnly: unknown;
      startedAt: unknown;
    };
    if (typeof pid === "number" && Number.isInteger(pid) && pid > 0) {
      return {
        pid,
        fingerprint: fingerprint === true,
        pidOnly: pidOnly === true,
        startedAt: typeof startedAt === "string" ? startedAt : null,
      };
    }
  } catch {
    // Locks written before ownership fingerprints used the PID prefix only.
  }
  return {
    pid: Number(token.split("-", 1)[0]),
    fingerprint: false,
    pidOnly: false,
    startedAt: null,
  };
}

function withLock<T>(fn: () => T): T {
  mkdirSync(dirname(LOCAL_FILE), { recursive: true });
  for (;;) {
    try {
      const fd = openSync(LOCK_FILE, "wx");
      const token = lockToken();
      writeFileSync(fd, token);
      let parsed: { pidOnly?: boolean };
      try {
        parsed = JSON.parse(token) as { pidOnly?: boolean };
      } catch {
        parsed = {};
      }
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      if (parsed.pidOnly) {
        const touch = () => {
          try {
            utimesSync(LOCK_FILE, new Date(), new Date());
          } catch {
            // lock released
          }
        };
        heartbeat = setInterval(touch, PID_ONLY_STALE_MS / 3);
      }
      try {
        return fn();
      } finally {
        if (heartbeat) clearInterval(heartbeat);
        closeSync(fd);
        try {
          if (readFileSync(LOCK_FILE, "utf8") === token) unlinkSync(LOCK_FILE);
        } catch {
          // already released
        }
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw err;
      try {
        if (Date.now() - statSync(LOCK_FILE).mtimeMs > LOCK_STALE_MS) {
          const lockStat = statSync(LOCK_FILE);
          const token = readFileSync(LOCK_FILE, "utf8");
          const owner = lockOwner(token);
          let ownerAlive = false;
          if (owner.pidOnly) {
            ownerAlive =
              Date.now() - statSync(LOCK_FILE).mtimeMs <= PID_ONLY_STALE_MS;
          } else if (Number.isInteger(owner.pid) && owner.pid > 0) {
            try {
              process.kill(owner.pid, 0);
              ownerAlive =
                owner.fingerprint &&
                typeof owner.startedAt === "string" &&
                processStartTime(owner.pid) === owner.startedAt;
            } catch (error) {
              ownerAlive =
                (error as NodeJS.ErrnoException).code === "EPERM" &&
                owner.fingerprint &&
                typeof owner.startedAt === "string" &&
                processStartTime(owner.pid) === owner.startedAt;
            }
          }
          if (!ownerAlive) {
            try {
              const currentStat = statSync(LOCK_FILE);
              if (
                currentStat.mtimeMs === lockStat.mtimeMs &&
                readFileSync(LOCK_FILE, "utf8") === token
              ) {
                unlinkSync(LOCK_FILE);
              }
            } catch {
              // lock vanished or a successor acquired it
            }
          }
        }
      } catch {
        // lock vanished or we raced with the holder releasing it
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}

function localShelf(): Shelf {
  // Mutations re-read the file first so a snippet pushed between render and
  // action isn't clobbered by a stale in-memory list. Pin and remove only ever
  // shrink or rewrite the list, so trimming is the pusher's job, not ours.
  // Take the same lock the CLI and shelf service use so overlapping writers
  // cannot each load one snapshot and rename away the other's update.
  function mutate(fn: (items: Item[]) => Item[]) {
    withLock(() => {
      writeLocal(fn(readLocal()));
    });
  }

  return {
    isRemote: false,
    origin: LOCAL_FILE,
    async load() {
      return readLocal();
    },
    watch(onChange) {
      if (existsSync(LOCAL_FILE)) {
        watchFile(LOCAL_FILE, { interval: WATCH_MS }, onChange);
        return () => unwatchFile(LOCAL_FILE);
      }
      // Nothing to watch yet. Poll for the file to appear, then switch to
      // watching it, so a first-ever push still shows up live.
      let watching = false;
      const iv = setInterval(() => {
        if (!existsSync(LOCAL_FILE)) return;
        watchFile(LOCAL_FILE, { interval: WATCH_MS }, onChange);
        watching = true;
        clearInterval(iv);
        onChange();
      }, WATCH_MS);
      return () => {
        clearInterval(iv);
        if (watching) unwatchFile(LOCAL_FILE);
      };
    },
    async setPinned(item, pinned) {
      mutate((items) =>
        items.map((i) => (i.id === item.id ? { ...i, pinned } : i)),
      );
    },
    async remove(item) {
      mutate((items) => items.filter((i) => i.id !== item.id));
    },
    async clear() {
      withLock(() => writeLocal([]));
    },
  };
}

function validateRemoteUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Shelf URL must be a valid URL");
  }
  const loopback = new Set(["localhost", "127.0.0.1", "::1"]);
  if (parsed.protocol === "https:") return raw.replace(/\/$/, "");
  if (parsed.protocol === "http:" && loopback.has(parsed.hostname)) {
    return raw.replace(/\/$/, "");
  }
  throw new Error(
    "Shelf URL must use HTTPS. HTTP is only allowed for loopback testing (127.0.0.1).",
  );
}

function remoteShelf(shelfUrl: string, shelfToken: string): Shelf {
  const base = validateRemoteUrl(shelfUrl);

  async function api(suffix = "", init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${shelfToken}`);
    const res = await fetch(base + suffix, { ...init, headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res;
  }

  return {
    isRemote: true,
    origin: base,
    async load() {
      return (await (await api()).json()) as Item[];
    },
    watch(onChange) {
      const iv = setInterval(onChange, POLL_MS);
      return () => clearInterval(iv);
    },
    async setPinned(item, pinned) {
      await api(`/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
    },
    async remove(item) {
      await api(`/${item.id}`, { method: "DELETE" });
    },
    async clear() {
      await api("", { method: "DELETE" });
    },
  };
}

export function getShelf(): Shelf {
  const { shelfUrl, shelfToken } = getPreferenceValues<Preferences>();
  const url = shelfUrl?.trim();
  return url ? remoteShelf(url, shelfToken?.trim() || "") : localShelf();
}

export function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.ts - a.ts;
  });
}
