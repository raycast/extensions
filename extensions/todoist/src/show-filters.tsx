import { ActionPanel, Action, Icon, List, confirmAlert, Color, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo } from "react";

import { Filter as TFilter, updateFilter, deleteFilter as apiDeleteFilter } from "./api";
import Filter from "./components/Filter";
import OpenInTodoist from "./components/OpenInTodoist";
import { getColorByKey } from "./helpers/colors";
import { getFilterAppUrl, getFilterUrl } from "./helpers/filters";
import { withTodoistApi } from "./helpers/withTodoistApi";
import useSyncData from "./hooks/useSyncData";

function Filters() {
  const { data, setData, isLoading } = useSyncData();

  const filters = useMemo(() => {
    return data?.filters.sort((a, b) => a.item_order - b.item_order) ?? [];
  }, [data]);

  async function toggleFavorite(filter: TFilter) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: filter.is_favorite ? "Removing from favorites" : "Adding to favorites",
      });

      await updateFilter({ id: filter.id, is_favorite: !filter.is_favorite }, { data, setData });

      await showToast({
        style: Toast.Style.Success,
        title: filter.is_favorite ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to update filter" });
    }
  }

  async function deleteFilter(id: string) {
    if (
      await confirmAlert({
        title: "Delete Filter",
        message: "Are you sure you want to delete this filter?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting filter" });

        await apiDeleteFilter(id, { data, setData });

        await showToast({ style: Toast.Style.Success, title: "Filter deleted" });
      } catch (error) {
        await showFailureToast(error, { title: "Unable to delete filter" });
      }
    }
  }

  return (
    <List searchBarPlaceholder="Filter filters by name" isLoading={isLoading}>
      {filters.map((filter) => {
        return (
          <List.Item
            key={filter.id}
            icon={{ source: Icon.Tag, tintColor: getColorByKey(filter.color).value }}
            title={filter.name}
            accessories={[
              {
                icon: filter.is_favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined,
                tooltip: filter.is_favorite ? "Favorite" : undefined,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Sidebar} title="Show Tasks" target={<Filter name={filter.name} />} />
                <OpenInTodoist appUrl={getFilterAppUrl(filter.id)} webUrl={getFilterUrl(filter.id)} />
                <ActionPanel.Section>
                  <Action
                    title={filter.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={() => toggleFavorite(filter)}
                  />

                  <Action
                    title="Delete Filter"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteFilter(filter.id)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Filter URL"
                    content={getFilterUrl(filter.id)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />

                  <Action.CopyToClipboard
                    title="Copy Filter Title"
                    content={filter.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}

      <List.EmptyView title="You don't have any filters." />
    </List>
  );
}

export default withTodoistApi(Filters);
