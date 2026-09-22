import { readFocusSetup, type Category, type FocusSetup, type Stranded } from "./focusSetup.ts";
import type { GoalBlocks, SessionStore } from "./store.ts";

export type BlockPlan = GoalBlocks & {
  source: "goal" | "none";
};

const NOTHING: BlockPlan = { categories: [], mode: "block", skipped: [], source: "none" };

export async function learnGoalBlocks(
  store: SessionStore,
  readSetup: () => Promise<FocusSetup | null> = readFocusSetup,
): Promise<{ setup: FocusSetup | null; blocks: Record<string, GoalBlocks> }> {
  const setup = await readSetup();
  const state = await store.readState();
  if (!setup?.goal) return { setup, blocks: state.goalBlocks };

  const learned: GoalBlocks = { categories: setup.categories, mode: setup.mode, skipped: setup.skipped };
  const known = state.goalBlocks[setup.goal];
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  const strandedIds = (ss: Stranded[]) => ss.map((s) => s.id);
  const ids = (cs: Category[]) => cs.map((c) => c.id);
  const unchanged =
    known?.mode === learned.mode &&
    same(ids(known.categories ?? []), ids(learned.categories)) &&
    same(strandedIds(known.skipped ?? []), strandedIds(learned.skipped));

  if (unchanged) return { setup, blocks: { ...state.goalBlocks, [setup.goal]: learned } };

  const next = await store.mutateState((current) => ({
    ...current,
    goalBlocks: { ...current.goalBlocks, [setup.goal]: learned },
  }));
  return { setup, blocks: next.goalBlocks };
}

export function planFor(
  goal: string,
  blocks: Record<string, GoalBlocks>,
  setup: FocusSetup | null,
  owned?: Category & { apps: string[]; websites: string[] },
): BlockPlan {
  const known = blocks[goal] ?? (setup?.goal === goal ? setup : undefined);
  const base: BlockPlan = known
    ? { categories: known.categories, mode: known.mode, skipped: known.skipped ?? [], source: "goal" }
    : NOTHING;

  if (!owned) return base;
  const held = new Set([...owned.apps, ...owned.websites]);
  if (!base.skipped.some((s) => held.has(s.id))) return base;
  return {
    ...base,
    categories: base.categories.some((c) => c.id === owned.id)
      ? base.categories
      : [...base.categories, { id: owned.id, title: owned.title }],
    skipped: base.skipped.filter((x) => !held.has(x.id)),
    source: "goal",
  };
}

export function describeStranded(stranded: Stranded[]): string {
  const apps = stranded.filter((s) => s.app).map((s) => s.title);
  const sites = stranded.filter((s) => !s.app).map((s) => s.title);
  return [apps.length ? `Apps: ${apps.join(", ")}` : "", sites.length ? `Sites: ${sites.join(", ")}` : ""]
    .filter(Boolean)
    .join("\n");
}
