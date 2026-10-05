import { findCategory, ownCategoryFor, type FocusCategory } from "./focusCategories.ts";
import { readFocusSetup, type Category, type FocusSetup, type Stranded } from "./focusSetup.ts";
import type { GoalBlocks, SessionStore } from "./store.ts";

export type BlockPlan = GoalBlocks & {
  source: "goal" | "none";
};

const NOTHING: BlockPlan = { categories: [], mode: "block", skipped: [], source: "none" };

export type LearnedBlocks = { setup: FocusSetup | null; blocks: Record<string, GoalBlocks> };

export const NOTHING_LEARNED: LearnedBlocks = { setup: null, blocks: {} };

export async function learnGoalBlocks(
  store: SessionStore,
  readSetup: () => Promise<FocusSetup | null> = readFocusSetup,
): Promise<LearnedBlocks> {
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

export function withNamedCategory(plan: BlockPlan, goal: string): BlockPlan {
  const own = ownCategoryFor(goal);
  if (plan.mode === "allow" || !plan.skipped.length || plan.categories.some((c) => c.id === own.id)) return plan;
  return { ...plan, categories: [...plan.categories, own], source: "goal" };
}

export type CategoryNeed = { name: string; stranded: Stranded[]; own: Category; exists: boolean; pending: boolean };

const SET_UP_TRUST_MS = 24 * 60 * 60 * 1000;

export function quickStartPlan(
  goal: string,
  learned: LearnedBlocks,
  categories: FocusCategory[],
  raycast2: boolean,
  now = Date.now(),
): { plan: BlockPlan; need?: CategoryNeed } {
  const own = ownCategoryFor(goal);
  const owned = raycast2 ? undefined : findCategory(categories, own.title);
  const base = planFor(goal, learned.blocks, learned.setup, owned);
  const plan = raycast2 ? withNamedCategory(base, goal) : base;
  if (!plan.skipped.length || (raycast2 && plan.mode === "allow")) return { plan };
  const known = learned.blocks[goal];
  const exists = raycast2 ? (known?.categories ?? []).some((c) => c.id === own.id) : !!owned;
  const pending = raycast2 && known?.setUpAt !== undefined && now - known.setUpAt < SET_UP_TRUST_MS;
  return { plan, need: { name: goal, stranded: plan.skipped, own, exists, pending } };
}

export function strandedSummary(stranded: Stranded[], shown = 1): string {
  const names = stranded
    .slice(0, shown)
    .map((s) => s.title)
    .join(", ");
  const rest = stranded.length - shown;
  return rest > 0 ? `${names} +${rest}` : names;
}

export function strandedList(stranded: Stranded[], shown = 3): string {
  const names = stranded.slice(0, shown).map((s) => s.title);
  if (stranded.length > shown) names.push(`${stranded.length - shown} more`);
  return new Intl.ListFormat("en", { type: "disjunction" }).format(names);
}
