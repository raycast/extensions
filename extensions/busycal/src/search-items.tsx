import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { queryBusyCalItems } from "./busycal-automation";
import { formatOccurrence } from "./busycal-date";
import { useBusyCalInstallation } from "./busycal-hooks";
import { BusyCalItem } from "./types";
import { BusyCalItemActions } from "./item-actions";

/**
 * Raycast command entry point for BusyCal item search.
 */
export default function SearchItemsCommand() {
  const {
    data: installation,
    error: installationError,
    isLoading: isLoadingInstallation,
  } = useBusyCalInstallation();
  const [searchText, setSearchText] = useState("");
  const normalizedSearchText = searchText.trim();
  const {
    data: matchedItems = [],
    error: searchError,
    isLoading: isSearching,
  } = useCachedPromise(
    async (
      activeInstallation: typeof installation,
      activeSearchText: string,
    ) => {
      if (!activeInstallation) {
        return [];
      }

      return queryBusyCalItems(activeInstallation, {
        searchText: activeSearchText,
        itemTypes: ["event", "task"],
        fetchLimit: 50,
      });
    },
    [installation, normalizedSearchText],
    {
      execute: Boolean(installation && normalizedSearchText),
      initialData: [] as BusyCalItem[],
      keepPreviousData: true,
      onError: () => {},
    },
  );
  const items = useMemo(
    () => (normalizedSearchText ? matchedItems : []),
    [matchedItems, normalizedSearchText],
  );
  const errorMessage = searchError?.message ?? installationError?.message;
  const isLoading = isLoadingInstallation || isSearching;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search BusyCal events and tasks"
      throttle
    >
      {errorMessage ? (
        <List.EmptyView
          title="BusyCal unavailable"
          description={errorMessage}
        />
      ) : null}
      {!errorMessage && !searchText.trim() ? (
        <List.EmptyView
          title="Start typing to search BusyCal"
          description="Searches events and tasks using BusyCal's scripting surface."
        />
      ) : null}
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={item.type === "task" ? Icon.Circle : Icon.Calendar}
          title={item.title || "Untitled"}
          subtitle={item.location}
          accessories={[{ text: formatOccurrence(item) ?? item.type }]}
          actions={
            installation ? (
              <BusyCalItemActions installation={installation} item={item} />
            ) : (
              <ActionPanel>
                <Action title="BusyCal Is Still Loading" />
              </ActionPanel>
            )
          }
        />
      ))}
    </List>
  );
}
