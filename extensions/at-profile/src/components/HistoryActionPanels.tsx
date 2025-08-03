import { ActionPanel, Action, Icon, Clipboard, showToast, Toast } from "@raycast/api";
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
        // eslint-disable-next-line @raycast/prefer-title-case
        title={`Copy Profile URL`}
        icon={Icon.Clipboard}
        onAction={async () => {
          try {
            const url = item.url.toString();
            await Clipboard.copy(url);
            await showToast(Toast.Style.Success, "Copied to Clipboard", url);
          } catch (error) {
            await showToast(Toast.Style.Failure, "Error", (error as Error).message);
          }
        }}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
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
          title={`Show Only @${item.profile}`}
          icon={Icon.Filter}
          onAction={() => {
            onSetSearchText(item.profile);
            onSetAppFilter("__all__");
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
        <Action
          title={`Show Only ${item.appName}`}
          icon={item.favicon || Icon.Filter}
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
