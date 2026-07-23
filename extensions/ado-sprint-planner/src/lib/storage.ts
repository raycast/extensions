import { LocalStorage } from "@raycast/api";
import { LocalStatus, ManualTodo, SprintPlan } from "./types";

// Per-item keys (one LocalStorage entry per status/deferral/note) so a write to
// one item never rewrites a shared blob — two commands editing different items
// can't clobber each other, even across Raycast's separate command processes.
const STATUS_PREFIX = "status:"; // status:<workItemId> -> LocalStatus
const DEFERRED_PREFIX = "deferred:"; // deferred:<workItemId> -> "1"
const NOTE_PREFIX = "note:"; // note:<noteId> -> JSON(ManualTodo)

const PLAN_KEY = "sprint-plan"; // single ordered list; see mutate() note below

/**
 * The plan is a single ordered list of ids, so — unlike statuses, deferrals and
 * notes, which are stored one key per item — it can't be decomposed and is
 * read-modify-written as a whole. Serialize those writes in-process so rapid
 * successive edits don't clobber each other. Cross-process isn't a concern for
 * the plan: it's written only by explicit, sequential user actions (Save Plan,
 * Move to Today) in foreground view commands, and Raycast shows one such view at
 * a time; the only always-on command (the menu bar) is read-only.
 */
let chain: Promise<unknown> = Promise.resolve();
function mutate<T>(op: () => Promise<T>): Promise<T> {
  const run = chain.then(op, op);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

// --- Plan ---

export async function getPlan(): Promise<SprintPlan | undefined> {
  const raw = await LocalStorage.getItem<string>(PLAN_KEY);
  return raw ? (JSON.parse(raw) as SprintPlan) : undefined;
}

function writePlan(plan: SprintPlan): Promise<void> {
  return LocalStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export async function savePlan(plan: SprintPlan): Promise<void> {
  await mutate(() => writePlan(plan));
}

/**
 * Pin a work item to the front of the saved plan's order so it lands in Today —
 * used for ad-hoc "Move to Today". Creates a minimal plan if none exists yet.
 */
export async function pinToToday(id: number): Promise<void> {
  await mutate(async () => {
    const plan = await getPlan();
    const order = plan ? [id, ...plan.order.filter((x) => x !== id)] : [id];
    await writePlan({
      iterationId: plan?.iterationId ?? "",
      generatedAt: new Date().toISOString(),
      order,
    });
  });
}

// --- Local status (Not Started / In Progress / Done) ---

export async function getStatusMap(): Promise<Map<number, LocalStatus>> {
  const all = await LocalStorage.allItems();
  const map = new Map<number, LocalStatus>();
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith(STATUS_PREFIX)) {
      map.set(Number(k.slice(STATUS_PREFIX.length)), v as LocalStatus);
    }
  }
  return map;
}

export async function setStatus(
  id: number,
  status: LocalStatus,
): Promise<Map<number, LocalStatus>> {
  const key = STATUS_PREFIX + id;
  // "not-started" is the default, so drop the key entirely to stay lean.
  if (status === "not-started") await LocalStorage.removeItem(key);
  else await LocalStorage.setItem(key, status);
  return getStatusMap();
}

// --- Deferred (shelved) items ---

export async function getDeferredSet(): Promise<Set<number>> {
  const all = await LocalStorage.allItems();
  const set = new Set<number>();
  for (const k of Object.keys(all)) {
    if (k.startsWith(DEFERRED_PREFIX)) {
      set.add(Number(k.slice(DEFERRED_PREFIX.length)));
    }
  }
  return set;
}

export async function setDeferred(
  id: number,
  deferred: boolean,
): Promise<Set<number>> {
  const key = DEFERRED_PREFIX + id;
  if (deferred) await LocalStorage.setItem(key, "1");
  else await LocalStorage.removeItem(key);
  return getDeferredSet();
}

// --- Manual (ad-hoc) to-dos shown atop Today ---

export async function getManualTodos(): Promise<ManualTodo[]> {
  const all = await LocalStorage.allItems();
  const notes: ManualTodo[] = [];
  for (const [k, v] of Object.entries(all)) {
    if (!k.startsWith(NOTE_PREFIX)) continue;
    try {
      notes.push(JSON.parse(v as string) as ManualTodo);
    } catch {
      // Skip a corrupt entry rather than break the whole list.
    }
  }
  // Highest seq first: newest on top, and within a batch the first-typed note.
  return notes.sort((a, b) => b.seq - a.seq);
}

/**
 * Split raw box text into one or more notes. A "/" that begins a new point —
 * at the very start or right after whitespace/newline — starts a new note; a
 * "/" inside a word or URL (and/or, http://) is left intact. So
 * "-a\n-b\n/c" -> ["-a\n-b", "c"], while "-a -b -c" stays a single note.
 */
export function splitNoteText(input: string): string[] {
  return input
    .split(/(?:^|\s)\/(?=\S)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Add one or more notes from the box (see splitNoteText). Each is written under
 * its own key. Newest lands on top; within a batch, typed order is preserved
 * (first point gets the highest seq). Blank text is ignored.
 */
export async function addManualTodo(text: string): Promise<ManualTodo[]> {
  const parts = splitNoteText(text);
  if (parts.length === 0) return getManualTodos();
  const base = Date.now();
  const now = new Date().toISOString();
  await Promise.all(
    parts.map((t, i) => {
      const note: ManualTodo = {
        id: `n-${base}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        text: t,
        createdAt: now,
        // First-typed gets the highest seq so it ends up on top.
        seq: base + (parts.length - 1 - i),
      };
      return LocalStorage.setItem(NOTE_PREFIX + note.id, JSON.stringify(note));
    }),
  );
  return getManualTodos();
}

/** Re-add a completed note verbatim (preserves id, seq + createdAt) — powers Undo. */
export async function restoreManualTodo(note: ManualTodo): Promise<void> {
  const key = NOTE_PREFIX + note.id;
  if (await LocalStorage.getItem<string>(key)) return; // already present
  await LocalStorage.setItem(key, JSON.stringify(note));
}

/**
 * Set a note's local status. "done" removes it (notes disappear once done —
 * the caller can offer Undo via restoreManualTodo); other statuses update the
 * note in place, keeping its id, seq, and createdAt. Touches only this note's key.
 */
export async function setManualTodoStatus(
  id: string,
  status: LocalStatus,
): Promise<ManualTodo[]> {
  const key = NOTE_PREFIX + id;
  if (status === "done") {
    await LocalStorage.removeItem(key);
  } else {
    const raw = await LocalStorage.getItem<string>(key);
    if (raw) {
      const note = JSON.parse(raw) as ManualTodo;
      await LocalStorage.setItem(key, JSON.stringify({ ...note, status }));
    }
  }
  return getManualTodos();
}

/**
 * Edit a note's text in place, keeping its id, seq, and createdAt (so its
 * "carried Nd" age is preserved). Touches only this note's key. Blank text is
 * ignored.
 */
export async function updateManualTodo(
  id: string,
  text: string,
): Promise<ManualTodo[]> {
  const trimmed = text.trim();
  if (!trimmed) return getManualTodos();
  const key = NOTE_PREFIX + id;
  const raw = await LocalStorage.getItem<string>(key);
  if (raw) {
    const note = JSON.parse(raw) as ManualTodo;
    await LocalStorage.setItem(key, JSON.stringify({ ...note, text: trimmed }));
  }
  return getManualTodos();
}
