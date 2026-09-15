import type { Mutation } from "./protocol";

export type FormSaveResult = "stay-open" | "close" | "failed";

/** New entries stay in input mode for consecutive additions; edits return to the list. */
export async function saveTodoDraft(
  title: string,
  todoID: string | undefined,
  mutate: (operation: Mutation) => Promise<boolean>,
): Promise<FormSaveResult> {
  const operation: Mutation = todoID ? ["edit", todoID, title] : ["add", title];
  if (!(await mutate(operation))) return "failed";
  return todoID ? "close" : "stay-open";
}
