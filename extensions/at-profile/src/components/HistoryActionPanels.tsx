import { ActionPanel, Action, Icon } from "@raycast/api";
import { HistoryItem } from "../types";

interface HistoryActionPanelsProps {
  item: HistoryItem;
  onOpenProfile: (profile: string, app: string) => void;
  onDeleteHistoryItem: (profile: string, app: string) => void;
  onSetSearchText: (text: string) => void;
  onSetAppFilter: (filter: string) => void;
  onFilterByApp: (app: string) => void;
  OpenProfileCommand: React.ComponentType<{ arguments: { profile: string } }>;
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
        title={`Open @${item.profile} on ${item.appName}`}
        icon={Icon.Globe}
        onAction={() => onOpenProfile(item.profile, item.app)}
      />
      <Action.Push
        // eslint-disable-next-line @raycast/prefer-title-case
        title={`Open @${item.profile} on…`}
        icon={Icon.Terminal}
        target={<OpenProfileCommand arguments={{ profile: item.profile }} />}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action
        title="Delete History Item"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={() => onDeleteHistoryItem(item.profile, item.app)}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />
      <ActionPanel.Section>
        <Action
          title={`Show All @${item.profile}`}
          icon={Icon.MagnifyingGlass}
          onAction={() => {
            onSetSearchText(item.profile);
            onSetAppFilter("__all__");
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
        <Action
          title={`Show Only ${item.appName}`}
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
