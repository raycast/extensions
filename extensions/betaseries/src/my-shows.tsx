import {
  LaunchType,
  List,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { useFetch, useLocalStorage } from "@raycast/utils";
import {
  buildBetaSeriesUrl,
  getHeaders,
  parseBetaSeriesResponse,
} from "./api/client";
import { Show } from "./types/betaseries";
import { ShowListItem } from "./components/ShowListItem";
import { TokenRequiredView } from "./components/TokenRequiredView";
import { useAuthToken } from "./hooks/useAuthToken";
import {
  DISABLED_SHOW_NOTIFICATIONS_KEY,
  normalizeNumberIds,
} from "./notifications";

type ShowFilter = "to-watch" | "active" | "archived";
const SHOW_FILTERS: ShowFilter[] = ["to-watch", "active", "archived"];
const isShowFilter = (value: string): value is ShowFilter =>
  SHOW_FILTERS.includes(value as ShowFilter);

export default function Command() {
  const [filter, setFilter] = useState<ShowFilter>("to-watch");
  const { token, isLoading: isTokenLoading, setToken, logout } = useAuthToken();
  const tokenAvailable = Boolean(token);
  const {
    value: storedDisabledShowIds,
    setValue: setStoredDisabledShowIds,
    isLoading: isDisabledShowIdsLoading,
  } = useLocalStorage<number[]>(DISABLED_SHOW_NOTIFICATIONS_KEY, []);

  const disabledShowIds = normalizeNumberIds(storedDisabledShowIds);
  const disabledShowIdsSet = useMemo(
    () => new Set(disabledShowIds),
    [disabledShowIds],
  );

  const {
    data: rawItems = [],
    isLoading,
    mutate,
  } = useFetch<{ shows: Show[] }, Show[], Show[]>(
    buildBetaSeriesUrl("/shows/member", {
      limit: "100",
      ...(filter === "to-watch" && { status: "current" }),
      ...(filter === "archived" && { status: "archived" }),
    }),
    {
      headers: getHeaders(token),
      execute: tokenAvailable && !isTokenLoading,
      keepPreviousData: true,
      initialData: [],
      parseResponse: (response) =>
        parseBetaSeriesResponse<{ shows: Show[] }>(response),
      mapResult: (result) => ({ data: result.shows || [] }),
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load shows",
          message: error.message,
        });
      },
    },
  );
  const items = useMemo(
    () =>
      filter === "active"
        ? rawItems.filter((show) => !show.user?.archived)
        : rawItems,
    [filter, rawItems],
  );
  const handleFilterChange = (newValue: string) => {
    if (isShowFilter(newValue)) {
      setFilter(newValue);
    }
  };

  if (isTokenLoading) {
    return <List isLoading />;
  }

  if (!tokenAvailable) {
    return <TokenRequiredView onTokenSaved={setToken} />;
  }

  const handleLogout = async () => {
    await logout();
    await showToast({
      style: Toast.Style.Success,
      title: "Logged out",
      message: "Your BetaSeries token has been removed.",
    });
  };

  return (
    <List
      isLoading={isLoading || isDisabledShowIdsLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          storeValue={true}
          onChange={handleFilterChange}
        >
          <List.Dropdown.Item title="To Watch" value="to-watch" />
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Archived" value="archived" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={
          filter === "to-watch"
            ? "No active shows"
            : filter === "active"
              ? "No active shows in your list"
              : "No archived shows"
        }
        description="Your list is empty for this filter."
      />
      {items.map((show) => (
        <ShowListItem
          key={show.id}
          show={show}
          isMyShow
          notificationsEnabled={
            !show.user?.archived && !disabledShowIdsSet.has(show.id)
          }
          onToggleNotifications={(showId, enabled) => {
            void (async () => {
              const nextDisabledShowIds = enabled
                ? disabledShowIds.filter((id) => id !== showId)
                : [...disabledShowIds, showId];

              await setStoredDisabledShowIds(
                normalizeNumberIds(nextDisabledShowIds),
              );
              await showToast({
                style: Toast.Style.Success,
                title: enabled
                  ? "Notifications enabled for this show"
                  : "Notifications disabled for this show",
              });

              await launchCommand({
                name: "new-episodes-menubar",
                type: LaunchType.Background,
              });
            })();
          }}
          onLogout={() => void handleLogout()}
          onArchiveChange={(showId, archived) => {
            void mutate(Promise.resolve(), {
              shouldRevalidateAfter: false,
              optimisticUpdate: (previous = []) =>
                previous.flatMap((item) => {
                  if (item.id !== showId) return [item];
                  const updated = {
                    ...item,
                    user: { ...item.user, archived },
                  };
                  if (
                    ((filter === "to-watch" || filter === "active") &&
                      archived) ||
                    (filter === "archived" && !archived)
                  ) {
                    return [];
                  }
                  return [updated];
                }),
            });
            void launchCommand({
              name: "new-episodes-menubar",
              type: LaunchType.Background,
            });
          }}
        />
      ))}
    </List>
  );
}
