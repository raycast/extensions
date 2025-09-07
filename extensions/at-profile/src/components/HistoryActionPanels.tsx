import { ActionPanel, Action, Icon, Clipboard } from "@raycast/api";
import { HistoryItem } from "../types";
import { EditProfileForm } from "./EditProfile";
import { safeAsyncOperation, showSuccess } from "../utils/errors";

interface HistoryActionPanelsProps {
  item: HistoryItem;
  onOpenProfile: (profile: string, app: string) => void;
  onDeleteHistoryItem: (profile: string, app: string) => void;
  onSetSearchText: (text: string) => void;
  onSetAppFilter: (filter: string) => void;
  onFilterByApp: (app: string) => void;
  onRefreshHistory: () => void;
  OpenProfileCommand: React.ComponentType<{ arguments: { profile: string } }>;
}

export function HistoryActionPanels({
  item,
  onOpenProfile,
  onDeleteHistoryItem,
  onSetSearchText,
  onSetAppFilter,
  onFilterByApp,
  onRefreshHistory,
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
        title={`Edit @${item.profile}`}
        icon={Icon.Pencil}
        target={
          <EditProfileForm
            originalProfile={item.profile}
            app={item.app}
            appName={item.appName}
            onUpdate={onRefreshHistory}
          />
        }
        shortcut={{ modifiers: ["cmd"], key: "e" }}
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
          await safeAsyncOperation(
            async () => {
              const url = item.url.toString();
              await Clipboard.copy(url);
              await showSuccess("Copied to Clipboard", url);
            },
            "Copy profile URL to clipboard",
            { toastTitle: "Error" },
          );
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
