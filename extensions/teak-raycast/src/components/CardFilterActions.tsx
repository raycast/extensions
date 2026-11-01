import { Action, ActionPanel, Icon } from "@raycast/api";
import type { RaycastCard } from "../lib/api";
import {
  applyArchivedFilter,
  applyDoneFilter,
  applyFavoritedFilter,
  applyHueFilter,
  applySortFilter,
  applyTagFilter,
  applyTrashedFilter,
  clearSearchFilters,
  HUE_OPTIONS,
  type ParsedSearchFilters,
  toSmartFolderQuery,
} from "../lib/searchFilters";
import { SmartFolderForm } from "./SmartFolderForm";

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export interface CardFilterActionsProps {
  canSaveSmartFolder: boolean;
  card: RaycastCard;
  filters: ParsedSearchFilters;
  keepNewestSort: boolean;
  onQueryChange: (update: (previous: string) => string) => void;
  onShuffle: () => void;
  removeTagFilterFromList: boolean;
  showFavoritesFilter: boolean;
}

export function CardFilterActions({
  canSaveSmartFolder,
  card,
  filters,
  keepNewestSort,
  onQueryChange,
  onShuffle,
  removeTagFilterFromList,
  showFavoritesFilter,
}: CardFilterActionsProps) {
  const tagOptions = [...card.tags, ...card.aiTags].slice(0, 8);
  const smartFolderQuery = canSaveSmartFolder
    ? toSmartFolderQuery(filters)
    : undefined;
  return (
    <ActionPanel.Section title="Filters">
      {showFavoritesFilter ? (
        <Action
          icon={Icon.Star}
          onAction={() =>
            onQueryChange((previous) =>
              applyFavoritedFilter(
                previous,
                filters.favorited ? undefined : true,
              ),
            )
          }
          title={filters.favorited ? "Show All Cards" : "Show Favorites Only"}
        />
      ) : null}
      <Action
        icon={Icon.Box}
        onAction={() =>
          onQueryChange((previous) =>
            applyArchivedFilter(previous, filters.archived ? undefined : true),
          )
        }
        title={filters.archived ? "Leave Archive" : "Show Archive"}
      />
      <Action
        icon={Icon.Trash}
        onAction={() =>
          onQueryChange((previous) =>
            applyTrashedFilter(previous, filters.trashed ? undefined : true),
          )
        }
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        title={filters.trashed ? "Leave Trash" : "Show Trash"}
      />
      <ActionPanel.Submenu icon={Icon.CheckCircle} title="Filter by Progress">
        <Action
          onAction={() =>
            onQueryChange((previous) => applyDoneFilter(previous))
          }
          title="All Links"
        />
        <Action
          onAction={() =>
            onQueryChange((previous) => applyDoneFilter(previous, "done"))
          }
          title="Done"
        />
        <Action
          onAction={() =>
            onQueryChange((previous) => applyDoneFilter(previous, "todo"))
          }
          title="To Do"
        />
      </ActionPanel.Submenu>
      <ActionPanel.Submenu icon={Icon.Swatch} title="Filter by Color">
        <Action
          onAction={() => onQueryChange((previous) => applyHueFilter(previous))}
          title="All Colors"
        />
        {HUE_OPTIONS.map((hue) => (
          <Action
            key={hue}
            onAction={() =>
              onQueryChange((previous) => applyHueFilter(previous, hue))
            }
            title={capitalize(hue)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu icon={Icon.ArrowUp} title="Sort Results">
        <Action
          onAction={() =>
            onQueryChange((previous) =>
              applySortFilter(previous, "newest", {
                keepNewest: keepNewestSort,
              }),
            )
          }
          title="Newest First"
        />
        <Action
          onAction={() =>
            onQueryChange((previous) => applySortFilter(previous, "oldest"))
          }
          title="Oldest First"
        />
        <Action icon={Icon.Shuffle} onAction={onShuffle} title="Shuffle" />
      </ActionPanel.Submenu>
      {tagOptions.length > 0 && !removeTagFilterFromList ? (
        <ActionPanel.Submenu icon={Icon.Tag} title="Filter by Tag">
          {tagOptions.map((tag) => (
            <Action
              key={tag}
              onAction={() =>
                onQueryChange((previous) => applyTagFilter(previous, tag))
              }
              title={tag}
            />
          ))}
        </ActionPanel.Submenu>
      ) : null}
      {smartFolderQuery ? (
        <Action.Push
          icon={Icon.Folder}
          target={<SmartFolderForm query={smartFolderQuery} />}
          title="Save Search as Smart Folder…"
        />
      ) : null}
      {filters.hasExplicitFilters ? (
        <Action
          icon={Icon.XMarkCircle}
          onAction={() =>
            onQueryChange((previous) => clearSearchFilters(previous))
          }
          title="Clear Filters"
        />
      ) : null}
    </ActionPanel.Section>
  );
}
