import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import {
  buildBetaSeriesUrl,
  getHeaders,
  parseBetaSeriesResponse,
} from "./api/client";
import { Show } from "./types/betaseries";
import { ShowListItem } from "./components/ShowListItem";
import { TokenRequiredView } from "./components/TokenRequiredView";
import { useAuthToken } from "./hooks/useAuthToken";

export default function Command() {
  const [filter, setFilter] = useState("active"); // active, archived
  const { token, isLoading: isTokenLoading, setToken, logout } = useAuthToken();
  const tokenAvailable = Boolean(token);

  const {
    data: items = [],
    isLoading,
    mutate,
  } = useFetch<{ shows: Show[] }, Show[], Show[]>(
    buildBetaSeriesUrl("/shows/member", {
      limit: "100",
      status: filter === "active" ? "current" : "archived",
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
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue={true} onChange={setFilter}>
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Archived" value="archived" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={filter === "active" ? "No active shows" : "No archived shows"}
        description="Your list is empty for this filter."
      />
      {items.map((show) => (
        <ShowListItem
          key={show.id}
          show={show}
          isMyShow
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
                    (filter === "active" && archived) ||
                    (filter === "archived" && !archived)
                  ) {
                    return [];
                  }
                  return [updated];
                }),
            });
          }}
        />
      ))}
    </List>
  );
}
