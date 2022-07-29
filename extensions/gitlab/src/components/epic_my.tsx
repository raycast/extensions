import { List } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Epic, EpicScope, EpicState, searchData } from "../gitlabapi";
import { hashRecord, showErrorToast } from "../utils";
import { EpicListItem } from "./epics";

export function MyEpicList(props: { scope: EpicScope; state: EpicState }): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading } = useCache<Epic[]>(
    hashRecord(props, "myepiclist"),
    async () => {
      const data = await gitlab.getUserEpics({
        min_access_level: "30",
        state: props.state,
        scope: props.scope,
      });
      return data;
    },
    {
      deps: [searchText],
      onFilter: async (epics) => {
        return searchData<Epic>(epics, { search: searchText || "", keys: ["title"], limit: 50 });
      },
    }
  );

  if (error) {
    showErrorToast(error, "Cannot search Epics");
  }

  return (
    <List
      searchBarPlaceholder="Filter Epics by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      {data?.map((epic) => (
        <EpicListItem key={epic.id} epic={epic} />
      ))}
    </List>
  );
}
