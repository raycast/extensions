import { Color, List } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Epic, EpicScope, EpicState, searchData } from "../gitlabapi";
import { getFirstChar, hashRecord, showErrorToast } from "../utils";
import { EpicListItem, includeGroupAncestorPreference } from "./epics";
import { GroupInfo, useMyGroups } from "./groups";
import { getTextIcon } from "../icons";

function GroupListDropDown(props: { groupsInfo?: GroupInfo; onChange?: (newValue: string) => void }) {
  const gi = props.groupsInfo;
  if (!gi || !gi.groups) {
    return null;
  }
  return (
    <List.Dropdown tooltip="Group" onChange={props.onChange}>
      <List.Dropdown.Item title="All Groups" value={""} />
      <List.Dropdown.Section>
        {gi.groups?.map((g) => (
          <List.Dropdown.Item
            key={`${g.id}`}
            icon={getTextIcon(getFirstChar(g.name))}
            title={g.full_name}
            value={`${g.id}`}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export function MyEpicList(props: { scope: EpicScope; state: EpicState }) {
  const [searchText, setSearchText] = useState<string>();
  const { groupsinfo } = useMyGroups();
  const [selectedGroupID, setSelectedGroupID] = useState<string>("");
  const [displayGroup, setDisplayGroup] = useState<boolean>();
  const { data, error, isLoading } = useCache<Epic[]>(
    hashRecord(props, `myepiclist_${props.scope}_${props.state}_${selectedGroupID}`),
    async () => {
      const data = await gitlab.getUserEpics({
        min_access_level: "10",
        state: props.state,
        scope: props.scope,
        groupid: selectedGroupID === "" ? undefined : selectedGroupID,
        include_descendant_groups: true,
        include_ancestor_groups: includeGroupAncestorPreference(),
      });
      return data;
    },
    {
      deps: [searchText, props.scope, props.state, selectedGroupID],
      onFilter: async (epics) => {
        return searchData<Epic>(epics, { search: searchText || "", keys: ["title"], limit: 50 });
      },
    },
  );

  if (error) {
    showErrorToast(error, "Cannot search Epics");
  }

  return (
    <List
      searchBarPlaceholder="Filter Epics by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<GroupListDropDown groupsInfo={groupsinfo} onChange={setSelectedGroupID} />}
    >
      <List.Section
        title={data ? (searchText && searchText.length > 0 ? "Search Results" : "Recent Epics") : undefined}
        subtitle={data ? `${data.length}` : undefined}
      >
        {data?.map((epic) => (
          <EpicListItem key={epic.id} epic={epic} displayGroup={displayGroup} onChangeDisplayGroup={setDisplayGroup} />
        ))}
      </List.Section>
      <List.EmptyView title="No Epics found" icon={{ source: "epic.svg", tintColor: Color.PrimaryText }} />
    </List>
  );
}
