import { LocalStorage } from "@raycast/api";
import { LocalStatus, ManualTodo, SprintPlan } from "./types";

const PLAN_KEY = "sprint-plan";
const STATUS_KEY = "local-status"; // Record<number, LocalStatus>, personal workflow status
const DEFERRED_KEY = "local-deferred"; // number[] of shelved work-item ids
const NOTES_KEY = "manual-todos"; // ManualTodo[], ad-hoc notes shown atop Today

/**
 * Serialize read-modify-write operations. Each mutator reads the whole value,
 * edits it, and writes it back; without serialization two rapid edits (e.g.
 * quickly setting several statuses, or add-note while completing another) could
 * interleave and the second write would silently discard the first. Chaining
 * every write through a single promise makes them run one at a time.
 *
 * In-process only, which is sufficient here: the menu-bar command is read-only,
 * and Raycast shows a single view at a time, so writes never overlap across
 * processes in practice.
 */
let chain: Promise<unknown> = Promise.resolve();
function mutate<T>(op: () => Promise<T>): Promise<T> {
  const run = chain.then(op, op);
  // Keep the chain alive regardless of this op's outcome (don't propagate).
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
  const raw = await LocalStorage.getItem<string>(STATUS_KEY);
  const record = raw ? (JSON.parse(raw) as Record<number, LocalStatus>) : {};
  const map = new Map<number, LocalStatus>();
  for (const [id, status] of Object.entries(record)) {
    map.set(Number(id), status);
  }
  return map;
}

export async function setStatus(
  id: number,
  status: LocalStatus,
): Promise<Map<number, LocalStatus>> {
  return mutate(async () => {
    const map = await getStatusMap();
    // "not-started" is the default, so drop it from storage to keep the map lean.
    if (status === "not-started") map.delete(id);
    else map.set(id, status);
    const record: Record<number, LocalStatus> = {};
    for (const [k, v] of map) record[k] = v;
    await LocalStorage.setItem(STATUS_KEY, JSON.stringify(record));
    return map;
  });
}

// --- Deferred (shelved) items ---

export async function getDeferredSet(): Promise<Set<number>> {
  const raw = await LocalStorage.getItem<string>(DEFERRED_KEY);
  return new Set<number>(raw ? (JSON.parse(raw) as number[]) : []);
}

export async function setDeferred(
  id: number,
  deferred: boolean,
): Promise<Set<number>> {
  return mutate(async () => {
    const set = await getDeferredSet();
    if (deferred) set.add(id);
    else set.delete(id);
    await LocalStorage.setItem(DEFERRED_KEY, JSON.stringify([...set]));
    return set;
  });
}

// --- Manual (ad-hoc) to-dos shown atop Today ---

export async function getManualTodos(): Promise<ManualTodo[]> {
  const raw = await LocalStorage.getItem<string>(NOTES_KEY);
  return raw ? (JSON.parse(raw) as ManualTodo[]) : [];
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
 * Add one or more notes from the box (see splitNoteText). Newest lands on top;
 * within a batch, typed order is preserved (first point ends up highest).
 * Blank text is ignored.
 */
export async function addManualTodo(text: string): Promise<ManualTodo[]> {
  const parts = splitNoteText(text);
  if (parts.length === 0) return getManualTodos();
  return mutate(async () => {
    const stamp = Date.now();
    const fresh: ManualTodo[] = parts.map((t, i) => ({
      id: `n-${stamp}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      text: t,
      createdAt: new Date().toISOString(),
    }));
    const notes = await getManualTodos();
    const next = [...fresh, ...notes];
    await LocalStorage.setItem(NOTES_KEY, JSON.stringify(next));
    return next;
  });
}

/** Re-add a completed note verbatim (preserves id + createdAt) — powers Undo. */
export async function restoreManualTodo(note: ManualTodo): Promise<void> {
  await mutate(async () => {
    const notes = await getManualTodos();
    if (notes.some((n) => n.id === note.id)) return;
    await LocalStorage.setItem(NOTES_KEY, JSON.stringify([note, ...notes]));
  });
}

/**
 * Set a note's local status. "done" removes it (notes disappear once done —
 * the caller can offer Undo via restoreManualTodo); other statuses update the
 * note in place, keeping its id, position, and createdAt.
 */
export async function setManualTodoStatus(
  id: string,
  status: LocalStatus,
): Promise<ManualTodo[]> {
  return mutate(async () => {
    const notes = await getManualTodos();
    const next =
      status === "done"
        ? notes.filter((n) => n.id !== id)
        : notes.map((n) => (n.id === id ? { ...n, status } : n));
    await LocalStorage.setItem(NOTES_KEY, JSON.stringify(next));
    return next;
  });
}

/**
 * Edit a note's text in place, keeping its id, position, and createdAt (so its
 * "carried Nd" age is preserved). Blank text is ignored.
 */
export async function updateManualTodo(
  id: string,
  text: string,
): Promise<ManualTodo[]> {
  const trimmed = text.trim();
  if (!trimmed) return getManualTodos();
  return mutate(async () => {
    const notes = await getManualTodos();
    const next = notes.map((n) => (n.id === id ? { ...n, text: trimmed } : n));
    await LocalStorage.setItem(NOTES_KEY, JSON.stringify(next));
    return next;
  });
}
