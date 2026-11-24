import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { UrlActions } from "./actions";
import { closeTab, failed, faviconFor, selectTab, Tab } from "./yab";

const LOCATION: Record<string, string> = { topApp: "Pinned", pinned: "Kept", unpinned: "Today" };

export function TabItem({ tab, onChange }: { tab: Tab; onChange?: () => void }) {
  let host = tab.url;
  try {
    host = new URL(tab.url).hostname.replace(/^www\./, "");
  } catch {
    // keep the raw URL
  }
  return (
    <List.Item
      id={`tab-${tab.id}`}
      title={tab.title || tab.url}
      subtitle={host}
      icon={faviconFor(tab.url)}
      keywords={[tab.url, tab.spaceTitle]}
      accessories={[
        ...(tab.active ? [{ icon: Icon.Eye, tooltip: "Current tab" }] : []),
        { tag: LOCATION[tab.location] ?? tab.location },
        { text: tab.spaceTitle },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Switch to Tab"
            icon={Icon.ArrowRight}
            onAction={() => selectTab(tab.id).catch((e) => failed("Could not switch tab", e))}
          />
          <UrlActions url={tab.url} title={tab.title} />
          <ActionPanel.Section>
            <Action
              title="Close Tab"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                await closeTab(tab.id).catch((e) => failed("Could not close tab", e));
                onChange?.();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
