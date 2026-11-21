// The account's articles and highlights on disk, kept current with GET /sync.
// Highlights, Read Next, the menu bar and the AI tools read it.

import { environment } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getSession, SignedOutError, sync } from "./api";
import { applySync, emptyLibrary } from "./logic";
import type { Library } from "./types";

const FILE = join(environment.supportPath, "library.json");

async function account() {
  const session = await getSession();
  if (!session) throw new SignedOutError();
  return `${session.email} ${session.server}`;
}

// What is on disk for the signed-in account, without asking the server.
export async function loadLibrary(): Promise<Library> {
  const owner = await account();
  try {
    const library = JSON.parse(await readFile(FILE, "utf8")) as Library;
    if (library.account === owner) return library;
  } catch {
    // No file yet, or one cut short: start over.
  }
  return emptyLibrary(owner);
}

export async function saveLibrary(library: Library) {
  await mkdir(environment.supportPath, { recursive: true });
  const draft = `${FILE}.${randomUUID()}.tmp`;
  await writeFile(draft, JSON.stringify(library));
  await rename(draft, FILE);
}

export async function forgetLibrary() {
  await rm(FILE, { force: true });
}

let running: Promise<Library> | undefined;

// Brings the library up to date and returns it. Calls made while one is
// under way share it.
export function syncLibrary(): Promise<Library> {
  running ??= pull().finally(() => (running = undefined));
  return running;
}

async function pull() {
  let library = await loadLibrary();
  const before = library.cursor;
  for (;;) {
    const page = await sync(library.cursor);
    library = applySync(library, page);
    if (!page.has_more) break;
  }
  if (library.cursor !== before) await saveLibrary(library);
  return library;
}

// The freshest library there is: synced, or the copy on disk when the
// server can't be reached.
export async function currentLibrary(): Promise<Library> {
  try {
    return await syncLibrary();
  } catch (error) {
    if (error instanceof SignedOutError) throw error;
    const library = await loadLibrary();
    if (library.cursor === 0) throw error;
    return library;
  }
}
