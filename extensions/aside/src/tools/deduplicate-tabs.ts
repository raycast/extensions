import { Action, Tool } from "@raycast/api";
import { getAsideTabSnapshot } from "../lib/applescript";
import { deduplicateTabs, planDuplicateTabs } from "../lib/tabs";

export const confirmation: Tool.Confirmation<Record<string, never>> = async () => {
  const snapshot = await getAsideTabSnapshot();
  const duplicates = planDuplicateTabs(snapshot.tabs);
  if (duplicates.length === 0) return undefined;
  const sample = duplicates
    .slice(0, 3)
    .map((tab) => tab.title || tab.url || tab.id)
    .join("; ");
  return {
    style: Action.Style.Destructive,
    message: `Close ${duplicates.length} duplicate Aside tab${duplicates.length === 1 ? "" : "s"}?`,
    info: [
      { name: "Duplicates", value: String(duplicates.length) },
      { name: "Sample", value: sample },
      { name: "Preserved", value: "The first open tab for each exact URL" },
    ],
  };
};

/** Close duplicate Aside tabs while preserving the first tab for each exact URL. */
export default async function tool() {
  return deduplicateTabs();
}
