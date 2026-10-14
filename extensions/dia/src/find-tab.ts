import { getFocusedTab, getTabs, type Tab } from "./dia";
import { filterTabs } from "./utils";

export type TabTarget = {
  /**
   * The ID of the tab, when known from a previous tool result.
   */
  tabId?: string;

  /**
   * Text matched against tab titles and URLs (case-insensitive), e.g. "github" or "Hacker News".
   *
   * @remarks
   * Ignored when tabId is provided. Omit both tabId and query to target the focused tab.
   */
  query?: string;
};

export const AUTOMATION_PERMISSION_MESSAGE =
  "Raycast needs permission to control Dia. Enable Dia under Raycast in System Settings → Privacy & Security → Automation, then try again.";

/** Replaces a denied Apple Events error (-1743) with instructions to grant Automation access. */
export function toAutomationError(error: unknown): unknown {
  if (error instanceof Error && error.message.includes("-1743")) {
    return new Error(AUTOMATION_PERMISSION_MESSAGE);
  }
  return error;
}

/** Resolves a tool's target to exactly one open tab, or throws a message the AI can act on. */
export async function findTab({ tabId, query }: TabTarget): Promise<Tab> {
  const trimmedQuery = query?.trim();

  if (!tabId && !trimmedQuery) {
    const focusedTab = await getFocusedTab();
    if (!focusedTab) {
      // Tab fetching swallows errors, so a denied Automation permission also lands here
      throw new Error(
        `No focused tab found. Make sure Dia is open with at least one window. ${AUTOMATION_PERMISSION_MESSAGE}`,
      );
    }
    return focusedTab;
  }

  const tabs = await getTabs();
  if (tabs.length === 0) {
    throw new Error(`No open tabs found in Dia. Make sure Dia is open. ${AUTOMATION_PERMISSION_MESSAGE}`);
  }

  if (tabId) {
    const tab = tabs.find((t) => t.tabId === tabId);
    if (!tab) {
      throw new Error(`No open tab has the ID "${tabId}". It may have been closed.`);
    }
    return tab;
  }

  const matches = filterTabs(tabs, trimmedQuery!) ?? [];
  const exactMatches = matches.filter((t) => t.title.toLowerCase() === trimmedQuery!.toLowerCase());
  const candidates = exactMatches.length === 1 ? exactMatches : matches;

  if (candidates.length === 0) {
    throw new Error(`No open tab matches "${trimmedQuery}".`);
  }
  if (candidates.length > 1) {
    const list = candidates
      .slice(0, 10)
      .map((t) => `- ${t.title} (${t.url ?? "no URL"}) [tabId: ${t.tabId}]`)
      .join("\n");
    throw new Error(
      `${candidates.length} tabs match "${trimmedQuery}". Ask the user which one they mean, then retry with its tabId:\n${list}`,
    );
  }
  return candidates[0];
}
