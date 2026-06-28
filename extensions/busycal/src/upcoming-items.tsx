import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { queryBusyCalItems } from "./busycal-automation";
import { busyCalSortTimestamp, formatOccurrence } from "./busycal-date";
import { useBusyCalInstallation } from "./busycal-hooks";
import { BusyCalItem } from "./types";
import { BusyCalItemActions } from "./item-actions";

/**
 * Raycast command entry point for the upcoming BusyCal list.
 */
export default function UpcomingItemsCommand() {
  const preferences = getPreferenceValues<Preferences.UpcomingItems>();
  const {
    data: installation,
    error: installationError,
    isLoading: isLoadingInstallation,
  } = useBusyCalInstallation();
  const {
    data: items = [],
    error: upcomingError,
    isLoading: isLoadingUpcoming,
  } = useCachedPromise(
    async (
      activeInstallation: typeof installation,
      upcomingDays: string,
      includeTasks: boolean,
    ) => {
      if (!activeInstallation) {
        return [];
      }

      const horizonDays = Number(upcomingDays || "7");
      const startDate = new Date();
      const endDate = new Date(
        startDate.getTime() + horizonDays * 24 * 60 * 60 * 1000,
      );
      const types = includeTasks
        ? (["event", "task"] as const)
        : (["event"] as const);
      const upcomingItems = await queryBusyCalItems(activeInstallation, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        itemTypes: [...types],
        fetchLimit: 100,
      });
      // BusyCal returns mixed events and tasks; sorting on the normalized
      // timestamp keeps due-dated tasks and event occurrences in one timeline.
      return [...upcomingItems].sort(
        (left, right) =>
          (busyCalSortTimestamp(left) ?? Number.MAX_SAFE_INTEGER) -
          (busyCalSortTimestamp(right) ?? Number.MAX_SAFE_INTEGER),
      );
    },
    [
      installation,
      preferences.defaultUpcomingDays || "7",
      preferences.includeTasksInUpcoming,
    ],
    {
      execute: Boolean(installation),
      initialData: [] as BusyCalItem[],
      keepPreviousData: true,
      onError: () => {},
    },
  );
  const errorMessage = upcomingError?.message ?? installationError?.message;
  const isLoading = isLoadingInstallation || isLoadingUpcoming;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Upcoming BusyCal items">
      {errorMessage ? (
        <List.EmptyView
          title="BusyCal unavailable"
          description={errorMessage}
        />
      ) : null}
      {!errorMessage && items.length === 0 ? (
        <List.EmptyView
          title="No upcoming items"
          description="Try increasing the default upcoming horizon in preferences."
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
            ) : undefined
          }
        />
      ))}
    </List>
  );
}
