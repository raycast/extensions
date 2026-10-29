import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { run } from "./notchwake";

const TABS: { id: string; title: string; icon: Icon }[] = [
  { id: "home", title: "Home", icon: Icon.House },
  { id: "agenda", title: "Calendar", icon: Icon.Calendar },
  { id: "tray", title: "File Tray", icon: Icon.Tray },
  { id: "clipboard", title: "Clipboard", icon: Icon.Clipboard },
  { id: "sessions", title: "Agents", icon: Icon.Terminal },
  { id: "usage", title: "Usage", icon: Icon.BarChart },
  { id: "timer", title: "Timer", icon: Icon.Clock },
  { id: "shortcuts", title: "Shortcuts", icon: Icon.Bolt },
];

export default function Command() {
  return (
    <List searchBarPlaceholder="Open the island on…">
      {TABS.map((tab) => (
        <List.Item
          key={tab.id}
          title={tab.title}
          icon={tab.icon}
          actions={
            <ActionPanel>
              <Action title="Open in Island" icon={Icon.ArrowRight} onAction={() => run("open", { tab: tab.id })} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
