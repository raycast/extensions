import { Alert, confirmAlert } from "@raycast/api";
import { closeTab, listTabs } from "../lib/browser";
import { closeTabsConfirmationMessage, parseTabReferences, resolveTabReferences } from "../lib/tool-utils";

type Input = {
  /** JSON array of tabs from Get Tabs. Each item must contain tabId and windowId. Titles are ignored because current tab details are re-fetched before confirmation. Example: [{"tabId":"tab-1","windowId":"window-1"}] */
  tabsJson: string;
};

export default async function tool({ tabsJson }: Input) {
  const requestedTabs = parseTabReferences(tabsJson);
  const plan = resolveTabReferences(requestedTabs, await listTabs());
  if (plan.stale.length) {
    throw new Error(
      `${plan.stale.length} selected tab${plan.stale.length === 1 ? " is" : "s are"} no longer available. Run Get Tabs again before closing tabs.`,
    );
  }
  if (!plan.tabs.length) throw new Error("No tabs were provided to close.");

  const confirmed = await confirmAlert({
    title: `Close ${plan.tabs.length} Aside tab${plan.tabs.length === 1 ? "" : "s"}?`,
    message: closeTabsConfirmationMessage(plan.tabs),
    primaryAction: { title: "Close Tabs", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) return { canceled: true, closed: [], failed: [] };

  const closed: string[] = [];
  const failed: Array<{ tabId: string; message: string }> = [];
  for (const tab of plan.tabs) {
    try {
      await closeTab(tab);
      closed.push(tab.id);
    } catch (error) {
      failed.push({ tabId: tab.id, message: error instanceof Error ? error.message : String(error) });
    }
  }

  return { canceled: false, closed, failed };
}
