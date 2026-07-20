import { List } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { pagerDutyClient, PAGE_LIMIT } from "./api";
import { Filter, ListIncidentsResponse, GetMeResponse } from "./types";
import { IncidentListItem } from "./components/IncidentListItem";

export default function Command() {
  const [filter, setFilter] = useState<Filter>("all");
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch current user ID
  const { isLoading: isLoadingUser } = useCachedPromise(async () => {
    const data = await pagerDutyClient.get<GetMeResponse>("/users/me");
    setUserId(data.user.id);
    return data;
  }, []);

  // Fetch incidents for current user
  const {
    isLoading: isLoadingIncidents,
    data: incidents,
    pagination,
    mutate,
  } = useCachedPromise(
    (userId: string) => async (options) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const params = new URLSearchParams({
        sort_by: "created_at:desc",
        limit: PAGE_LIMIT,
        offset: String(options.page * +PAGE_LIMIT),
        since: thirtyDaysAgo.toISOString(),
      });
      params.append("user_ids[]", userId);
      params.append("statuses[]", "triggered");
      params.append("statuses[]", "acknowledged");
      params.append("statuses[]", "resolved");

      const data = await pagerDutyClient.get<ListIncidentsResponse>(`/incidents?${params}`);
      return {
        data: data.incidents,
        hasMore: data.more,
      };
    },
    [userId ?? ""],
    {
      execute: userId !== null,
      initialData: [],
    },
  );

  const filteredIncidents = filter === "all" ? incidents : incidents.filter((item) => item.status === filter);
  const isLoading = isLoadingUser || isLoadingIncidents;

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Incidents by Status" onChange={(value) => setFilter(value as Filter)}>
          <List.Dropdown.Item title="All" value={"all"} />
          <List.Dropdown.Item title="Triggered" value={"triggered"} />
          <List.Dropdown.Item title="Acknowledged" value={"acknowledged"} />
          <List.Dropdown.Item title="Resolved" value={"resolved"} />
        </List.Dropdown>
      }
      pagination={pagination}
    >
      {filteredIncidents.map((incident) => (
        <IncidentListItem key={incident.id} incident={incident} mutateIncidents={mutate} />
      ))}
    </List>
  );
}
