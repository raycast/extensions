import { Action, ActionPanel, Icon, Image, Keyboard } from "@raycast/api";
import OpenProfileForm from "../forms/open-profile-form";
import { FAVORITE_COLOR, HISTORY_FILTER } from "../helpers/history";
import { EditProfileForm } from "./EditProfile";

interface HistoryActionPanelsProps {
  item: {
    profile: string;
    app: string;
    appName: string;
    url: string;
    favicon: Image.ImageLike;
    isStarred: boolean;
  };
  onOpenProfile: () => void;
  onDeleteHistoryItem: () => void;
  onToggleStar: () => void;
  onClearStarredProfiles: () => void;
  onSetSearchText: (text: string) => void;
  onSetAppFilter: (filter: string) => void;
}

export function HistoryActionPanels({
  item,
  onOpenProfile,
  onDeleteHistoryItem,
  onToggleStar,
  onClearStarredProfiles,
  onSetSearchText,
  onSetAppFilter,
}: HistoryActionPanelsProps) {
  return (
    <ActionPanel>
      <Action title={`Open @${item.profile} on ${item.appName}`} icon={item.favicon} onAction={onOpenProfile} />
      <Action.Push
        title={`Edit @${item.profile}`}
        icon={Icon.Pencil}
        target={<EditProfileForm originalProfile={item.profile} app={item.app} appName={item.appName} />}
        shortcut={Keyboard.Shortcut.Common.Edit}
      />
      <Action.Push
        title={`Open @${item.profile} on…`}
        icon={Icon.PersonCircle}
        target={<OpenProfileForm initialProfile={item.profile} />}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      {item.url && (
        <Action.CopyToClipboard
          title="Copy Profile URL"
          content={item.url}
          shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
        />
      )}
      <Action
        title={item.isStarred ? "Remove from Favorites" : "Add to Favorites"}
        icon={item.isStarred ? Icon.StarDisabled : { source: Icon.Star, tintColor: FAVORITE_COLOR }}
        onAction={onToggleStar}
        shortcut={Keyboard.Shortcut.Common.Pin}
      />
      <Action
        title="Delete History Item"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={onDeleteHistoryItem}
        shortcut={Keyboard.Shortcut.Common.Remove}
      />
      <Action
        title="Clear Favorites"
        icon={Icon.StarDisabled}
        style={Action.Style.Destructive}
        onAction={onClearStarredProfiles}
      />
      <ActionPanel.Section>
        <Action
          title={`Show Only @${item.profile}`}
          icon={Icon.Filter}
          onAction={() => {
            onSetSearchText(item.profile);
            onSetAppFilter(HISTORY_FILTER.ALL);
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
        <Action
          title={`Show Only ${item.appName}`}
          icon={item.favicon}
          onAction={() => onSetAppFilter(item.app)}
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
          onAction={() => onSetAppFilter(HISTORY_FILTER.ALL)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
