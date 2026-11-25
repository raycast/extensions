import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { toIcon } from "../icons";
import { clearRecentItems, removeRecentItem } from "../recentItems";
import { useSearchContext } from "../search.context";
import { RowNesting } from "../shared/nesting";
import { MenuItem } from "../shared/registry";

interface MenuRowProps {
  item: MenuItem;
  section: string;
  nesting?: RowNesting;
  removable?: boolean;
}

export function MenuRow({ item, section, nesting, removable = false }: MenuRowProps) {
  const { resolveUrl, openItem, reloadRecent } = useSearchContext();
  const url = resolveUrl(item);
  const secondaryUrl = item.secondaryUrl ? resolveUrl({ ...item, url: item.secondaryUrl }) : null;

  const removeFromHistory = async () => {
    const confirmed = await confirmAlert({
      title: "Remove from History?",
      message: `“${item.label}” will no longer show under Recently Opened.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await removeRecentItem(item.id);
      reloadRecent();
    }
  };

  const clearHistory = async () => {
    const confirmed = await confirmAlert({
      title: "Clear History?",
      message: "All recently opened entries will be removed.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await clearRecentItems();
      reloadRecent();
    }
  };

  return (
    <List.Item
      id={`${section}:${item.id}`}
      icon={toIcon(item.icon)}
      title={nesting?.nested ? `   ${item.label}` : item.label}
      subtitle={nesting?.parentLabel ?? item.subtitle ?? undefined}
      actions={
        <ActionPanel>
          <Action title="Open in Browser" icon={Icon.Globe} onAction={() => openItem(item, url)} />
          {secondaryUrl && (
            <Action title="Open Linked Record" icon={Icon.ArrowNe} onAction={() => openItem(item, secondaryUrl)} />
          )}
          {url && <Action.CopyToClipboard title="Copy Link" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />}
          {removable && (
            <ActionPanel.Section>
              <Action
                title="Remove from History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={removeFromHistory}
              />
              <Action
                title="Clear History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                onAction={clearHistory}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
