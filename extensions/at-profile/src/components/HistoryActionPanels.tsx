import { Action, ActionPanel, Icon, LaunchType } from "@raycast/api";

interface HistoryItem {
  username: string;
  app: string;
  appName: string;
  favicon?: string;
}

interface HistoryActionPanelsProps {
  item: HistoryItem;
  onOpenProfile: (username: string, app: string) => void;
  onDeleteHistoryItem: (username: string, app: string) => void;
  onSetSearchText: (text: string) => void;
  onSetAppFilter: (filter: string) => void;
  onFilterByApp: (app: string) => void;
  OpenProfileCommand: React.ComponentType<{ arguments: { profile: string }; launchType: LaunchType }>;
}

export function HistoryActionPanels({
  item,
  onOpenProfile,
  onDeleteHistoryItem,
  onSetSearchText,
  onSetAppFilter,
  onFilterByApp,
  OpenProfileCommand,
}: HistoryActionPanelsProps) {
  return (
    <ActionPanel>
      <Action
        title={`Open @${item.username} on ${item.appName}`}
        icon={Icon.Globe}
        onAction={() => onOpenProfile(item.username, item.app)}
      />
      <Action.Push
        title={`Open Profile on Other App`}
        icon={Icon.Terminal}
        target={
          <OpenProfileCommand
            arguments={{ profile: item.username }}
            launchType={LaunchType.UserInitiated}
          />
        }
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action
        title="Delete History Item"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={() => onDeleteHistoryItem(item.username, item.app)}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />
      <ActionPanel.Section>
        <Action
          title={`Show Other Items for @${item.username}`}
          icon={Icon.MagnifyingGlass}
          onAction={() => {
            onSetSearchText(item.username);
            onSetAppFilter("__all__");
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
        <Action
          title={`Filter by ${item.appName}`}
          icon={item.favicon || Icon.Globe}
          onAction={() => onFilterByApp(item.app)}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
        />
        <Action
          title="Clear Search"
          icon={Icon.XMarkCircle}
          onAction={() => onSetSearchText("")}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        />
        <Action
          title="Clear App Filter"
          icon={Icon.XMarkCircle}
          onAction={() => onSetAppFilter("__all__")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
