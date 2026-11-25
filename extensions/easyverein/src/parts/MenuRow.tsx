import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { toIcon } from "../icons";
import { RowNesting } from "../shared/nesting";
import { clearRecentItems, removeRecentItem } from "../recentItems";
import { MenuItem } from "../shared/registry";
import { useSearchContext } from "../search.context";

interface MenuRowProps {
  item: MenuItem;
  section: string;
  nesting?: RowNesting;
  removable?: boolean;
}

export function MenuRow({ item, section, nesting, removable = false }: MenuRowProps) {
  const { resolveUrl, openItem, setRecentItems } = useSearchContext();
  const url = resolveUrl(item);
  const secondaryUrl = item.secondaryUrl ? resolveUrl({ ...item, url: item.secondaryUrl }) : null;

  return (
    <List.Item
      id={`${section}:${item.id}`}
      icon={toIcon(item.icon)}
      title={nesting?.nested ? `   ${item.label}` : item.label}
      subtitle={nesting?.parentLabel ?? item.subtitle ?? undefined}
      actions={
        <ActionPanel>
          <Action
            title="Im Browser öffnen"
            icon={Icon.Globe}
            onAction={() => openItem(item, url)}
          />
          {secondaryUrl && (
            <Action
              title="Verknüpften Eintrag öffnen"
              icon={Icon.ArrowNe}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
              onAction={() => openItem(item, secondaryUrl)}
            />
          )}
          {url && (
            <Action.CopyToClipboard
              title="Link kopieren"
              content={url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          {removable && (
            <ActionPanel.Section>
              <Action
                title="Aus dem Verlauf entfernen"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => setRecentItems(await removeRecentItem(item.id))}
              />
              <Action
                title="Verlauf leeren"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                onAction={async () => {
                  await clearRecentItems();
                  setRecentItems([]);
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action
              title="Einstellungen öffnen"
              icon={Icon.Gear}
              onAction={() => openExtensionPreferences()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
