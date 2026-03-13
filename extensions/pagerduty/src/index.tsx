import { List } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { ListIncidentsResponse, Filter } from "./types";
import { pagerDutyClient, PAGE_LIMIT } from "./api";
import { IncidentListItem } from "./components/IncidentListItem";

export default function Command() {
  const [filter, setFilter] = useState<Filter>("all");

  const {
    isLoading,
    data: incidents,
    pagination,
    mutate,
  } = useCachedPromise(
    () => async (options) => {
      const data = await pagerDutyClient.get<ListIncidentsResponse>(
        "/incidents?" +
          new URLSearchParams({
            sort_by: "created_at:desc",
            limit: PAGE_LIMIT,
            offset: String(options.page * +PAGE_LIMIT),
          }),
      );
      return {
        data: data.incidents,
        hasMore: data.more,
      };
    },
    [],
    { initialData: [] },
  );

  const filteredIncidents = filter === "all" ? incidents : incidents.filter((item) => item.status === filter);

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
