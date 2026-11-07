// Which actions an item in Browse offers (ISC-30, 30.1), and which of them
// must ask first (ISC-37). The UI renders from this table, so the rules live
// in one testable place.

export type ItemType = "pattern" | "strategy" | "context" | "session" | "profile" | "workflow";

/** The one spelling of an item's id; pins and run counts are keyed by it. */
export const itemId = (type: ItemType, name: string) => `${type}:${name}`;

export type ActionId = "view" | "run" | "duplicate" | "edit" | "open" | "continue" | "rename" | "delete";

export interface ItemAction {
  id: ActionId;
  /** Destroys something; the UI must confirm before running it. */
  destructive: boolean;
}

/** fabric's shipped strategies (1.4.518); anything else in the folder is the user's. */
export const BUILT_IN_STRATEGIES = new Set([
  "aot",
  "cod",
  "cot",
  "ltm",
  "reflexion",
  "self-consistent",
  "self-refine",
  "standard",
  "tot",
]);

const BASE: Record<ItemType, ActionId[]> = {
  pattern: ["view", "run", "duplicate"],
  strategy: ["view", "duplicate"],
  context: ["view"],
  session: ["view", "continue"],
  profile: ["view"],
  workflow: ["view", "run"],
};

const OWN: Record<ItemType, ActionId[]> = {
  pattern: ["edit", "open", "delete"],
  strategy: ["edit", "open", "delete"],
  context: ["edit", "open", "delete"],
  session: ["rename", "delete"],
  profile: ["edit", "delete"],
  workflow: ["edit", "open", "delete"],
};

/** Run Fabric Pattern lists patterns, sessions and chains, so those are the items a pin can show up for. */
export const canPin = (type: ItemType) => type === "pattern" || type === "session" || type === "workflow";

/** What Manage Fabric's dropdown shows: each item type, plus the user's own patterns ("mine"). */
export type BrowseView = ItemType | "mine";

/** The types New can make; sessions come from runs. */
export type NewType = Exclude<ItemType, "session">;
const NEW_TYPES: NewType[] = ["pattern", "strategy", "context", "profile", "workflow"];

/** The New menu's order: the type being browsed first ("mine" is patterns), so New in Contexts starts on Context. */
export function newMenuOrder(view: BrowseView): NewType[] {
  const current = view === "mine" ? "pattern" : view;
  return [...NEW_TYPES].sort((a, b) => Number(b === current) - Number(a === current));
}

/** Run Fabric Pattern's row kinds. */
export type SearchKind = "pattern" | "session" | "workflow";
/** Typed per kind, so a session row can't list an action only a pattern row can render. */
export type PatternActionId = "run" | "configure" | "pin" | "copyName";
export type SessionActionId = "continue" | "pin" | "copyName";
/** A chain runs like a pattern: ↵ runs it, ⌘↵ configures. */
export type WorkflowActionId = PatternActionId;
export type SearchActionId = PatternActionId | SessionActionId;

// Raycast gives ↵ to a panel's first action and ⌘↵ to its second, whatever shortcut that one
// sets. A session row has no Configure Run, so Copy Name takes the second slot: Pin there made
// ⌘↵ toggle the pin.
const SEARCH: { pattern: PatternActionId[]; session: SessionActionId[]; workflow: WorkflowActionId[] } = {
  pattern: ["run", "configure", "pin", "copyName"],
  session: ["continue", "copyName", "pin"],
  workflow: ["run", "configure", "pin", "copyName"],
};

/** A Search row's actions in panel order; the view renders from this. */
export const searchActionsFor = <K extends SearchKind>(kind: K): (typeof SEARCH)[K] => SEARCH[kind];

/** `refused`: a chain fabric would refuse, offered only what fixes or removes it (never View or Run). */
export function actionsFor(type: ItemType, own: boolean, refused = false): ItemAction[] {
  return [...(refused ? [] : BASE[type]), ...(own ? OWN[type] : [])].map((id) => ({
    id,
    destructive: id === "delete",
  }));
}
