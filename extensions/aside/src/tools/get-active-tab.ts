import { listTabs } from "../lib/browser";
import { frontmostActiveTab } from "../lib/tool-utils";

export default async function tool() {
  const tab = frontmostActiveTab(await listTabs());
  if (!tab) throw new Error("Aside does not have an active tab.");
  return tab;
}
