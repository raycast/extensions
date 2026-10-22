// Finders for the rendered trees the view tests read: actions, form fields, Manage Fabric's lists,
// plus the fake fabric's log and the real-capture fixtures.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { elements, typeName } from "./render-harness";

export const actions = (tree: unknown) =>
  elements(tree).filter((e) => typeName(e).startsWith("Action") && typeName(e) !== "ActionPanel");
/** Every action's title, in panel order. */
export const titles = (tree: unknown) => actions(tree).map((e) => e.props.title as string);
export const action = (tree: unknown, title: string) => {
  const a = actions(tree).find((e) => e.props.title === title);
  if (!a) throw new Error(`no "${title}" action; have ${titles(tree)}`);
  return a.props as { onAction: () => unknown };
};
/** The form's Save, Rename or Run. */
export const submit = (tree: unknown) =>
  elements(tree).find((e) => typeName(e) === "Action.SubmitForm")!.props as { onSubmit: () => Promise<void> };
/** A form field by id, for reading it, typing into it or choosing a file. */
export const field = (tree: unknown, id: string) =>
  elements(tree).find((e) => e.props.id === id)!.props as { value: unknown; onChange: (v: unknown) => void };
/** A List row by id. */
export const item = (tree: unknown, id: string) =>
  elements(tree).find((e) => typeName(e) === "List.Item" && e.props.id === id);
/** Manage Fabric's lists: one built-in pattern, the rest empty unless given. */
export const lists = (extra: Record<string, unknown[]> = {}) => ({
  pattern: [{ id: "pattern:summarize", name: "summarize", type: "pattern", own: false }],
  mine: [],
  strategy: [],
  context: [],
  session: [],
  profile: [],
  workflow: [],
  ...extra,
});
/** Manage Fabric's type dropdown. */
export const dropdown = (tree: unknown) =>
  elements(tree).find((e) => typeName(e) === "List.Dropdown")!.props as {
    value: string;
    onChange: (v: string) => void;
  };
/** A Detail or List.Item.Detail metadata label's text, by its title. */
export const label = (tree: unknown, title: string) =>
  elements(tree).find((e) => typeName(e).endsWith("Metadata.Label") && e.props.title === title)?.props.text as
    string | undefined;
/** The argv the fake fabric logged (it writes argv one per line, then `--stdin--`). */
export const loggedArgv = (log: string | undefined) => (log ?? "").split("--stdin--")[0].split("\n").filter(Boolean);
/** A real-capture fixture's text. */
export const fixture = (name: string) => readFileSync(join(import.meta.dir, "fixtures", name), "utf8");
