import { List, ActionPanel, Action, Icon, confirmAlert, Alert, Keyboard, Color } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import type { Link, SortOption } from "../types";
import { LinkDetail } from "./LinkDetail";
import { deleteLink } from "../services/api";

interface LinkItemProps {
  link: Link;
  onRefresh: () => void;
  currentSort?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  isPinned?: boolean;
  onPin?: (slug: string) => void;
  onUnpin?: (slug: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const LinkItem = ({
  link,
  onRefresh,
  currentSort,
  onSortChange,
  isPinned = false,
  onPin,
  onUnpin,
  onMoveUp,
  onMoveDown,
}: LinkItemProps) => {
  const BASE_URL = getPreferenceValues<Preferences>().host;
  const shortUrl = `${BASE_URL}/${link.short_code}`;

  const handleDelete = async () => {
    if (
      await confirmAlert({
        title: "Delete Link",
        message: `Are you sure you want to delete ${link.short_code}?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      })
    ) {
      await deleteLink(link.short_code);
      onRefresh(); // Refetch the list after deletion
    }
  };

  const accessories: List.Item.Accessory[] = [];
  if (link.description) {
    accessories.push({
      tag: { value: link.description, color: Color.Blue },
      tooltip: "Description",
    });
  }
  accessories.push({
    tag: { value: link.visit_count.toString(), color: Color.Green },
    icon: Icon.Footprints,
    tooltip: "Visit Count",
  });

  return (
    <List.Item
      icon={link.is_enabled ? undefined : Icon.EyeDisabled}
      title={link.short_code}
      subtitle={link.original_url}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Short Link" content={shortUrl} />
            <Action.Push
              icon={Icon.Pencil}
              title="Edit"
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<LinkDetail link={link} onRefresh={onRefresh} />}
            />
            <Action
              icon={Icon.Trash}
              title="Delete Link"
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={handleDelete}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {isPinned ? (
              <>
                <Action
                  icon={Icon.Pin}
                  title="Unpin"
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  onAction={() => onUnpin?.(link.short_code)}
                />
                {onMoveUp && (
                  <Action
                    icon={Icon.ArrowUp}
                    title="Move up"
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={onMoveUp}
                  />
                )}
                {onMoveDown && (
                  <Action
                    icon={Icon.ArrowDown}
                    title="Move Down"
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={onMoveDown}
                  />
                )}
              </>
            ) : (
              <Action
                icon={Icon.Pin}
                title="Pin"
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => onPin?.(link.short_code)}
              />
            )}
          </ActionPanel.Section>

          {onSortChange && (
            <ActionPanel.Section title="Sort Options">
              <ActionPanel.Submenu
                title="Sort by Created Time"
                icon={Icon.Calendar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              >
                <Action
                  title="Newest First"
                  icon={currentSort === "created_desc" ? Icon.Checkmark : Icon.Calendar}
                  onAction={() => onSortChange("created_desc")}
                />
                <Action
                  title="Oldest First"
                  icon={currentSort === "created_asc" ? Icon.Checkmark : Icon.Calendar}
                  onAction={() => onSortChange("created_asc")}
                />
              </ActionPanel.Submenu>

              <ActionPanel.Submenu
                title="Sort by Last Visited"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              >
                <Action
                  title="Recently Visited"
                  icon={currentSort === "visited_desc" ? Icon.Checkmark : Icon.Clock}
                  onAction={() => onSortChange("visited_desc")}
                />
                <Action
                  title="Least Recently Visited"
                  icon={currentSort === "visited_asc" ? Icon.Checkmark : Icon.Clock}
                  onAction={() => onSortChange("visited_asc")}
                />
              </ActionPanel.Submenu>

              <ActionPanel.Submenu
                title="Sort by Visit Count"
                icon={Icon.BarChart}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              >
                <Action
                  title="Most Visited"
                  icon={currentSort === "visits_desc" ? Icon.Checkmark : Icon.BarChart}
                  onAction={() => onSortChange("visits_desc")}
                />
                <Action
                  title="Least Visited"
                  icon={currentSort === "visits_asc" ? Icon.Checkmark : Icon.BarChart}
                  onAction={() => onSortChange("visits_asc")}
                />
              </ActionPanel.Submenu>
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
};
