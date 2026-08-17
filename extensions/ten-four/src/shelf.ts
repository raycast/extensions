import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { join, dirname } from "path";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  watchFile,
  unwatchFile,
  existsSync,
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
  writeFileSync(LOCAL_FILE, JSON.stringify(items, null, 2));
}

function localShelf(): Shelf {
  // Mutations re-read the file first so a snippet pushed between render and
  // action isn't clobbered by a stale in-memory list. Pin and remove only ever
  // shrink or rewrite the list, so trimming is the pusher's job, not ours.
  function mutate(fn: (items: Item[]) => Item[]) {
    writeLocal(fn(readLocal()));
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
      writeLocal([]);
    },
  };
}

function remoteShelf(shelfUrl: string): Shelf {
  const base = shelfUrl.replace(/\/$/, "");

  async function api(suffix = "", init?: RequestInit): Promise<Response> {
    const res = await fetch(base + suffix, init);
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
  const { shelfUrl } = getPreferenceValues<{ shelfUrl?: string }>();
  const url = shelfUrl?.trim();
  return url ? remoteShelf(url) : localShelf();
}

export function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.ts - a.ts;
  });
}
