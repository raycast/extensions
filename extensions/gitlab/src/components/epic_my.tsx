import { Color, List } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { gitlab } from "../common";
import { Epic, EpicScope, EpicState, searchData } from "../gitlabapi";
import { getFirstChar, getPreferences } from "../utils";
import { EpicListItem } from "./epics";
import { GroupInfo, useMyGroups } from "./groups";
import { getTextIcon } from "../icons";

function GroupListDropDown(props: { groupsInfo: GroupInfo; onChange?: (newValue: string) => void }) {
  return (
    <List.Dropdown tooltip="Group" onChange={props.onChange}>
      <List.Dropdown.Item title="All Groups" value={""} />
      <List.Dropdown.Section>
        {props.groupsInfo.groups.map((group) => (
          <List.Dropdown.Item
            key={`${group.id}`}
            icon={getTextIcon(getFirstChar(group.name))}
            title={group.full_name}
            value={`${group.id}`}
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
  const { data, isLoading } = useCachedPromise(
    async (scope: EpicScope, state: EpicState, groupID: string): Promise<Epic[]> => {
      return gitlab.getUserEpics({
        min_access_level: "10",
        state,
        scope,
        groupid: groupID === "" ? undefined : groupID,
        include_descendant_groups: true,
        include_ancestor_groups: getPreferences().includeEpicAncestor,
      });
    },
    [props.scope, props.state, selectedGroupID],
    { initialData: [] },
  );

  const epics: Epic[] = searchData<Epic>(data, { search: searchText || "", keys: ["title"], limit: 50 });
  return (
    <List
      searchBarPlaceholder="Filter Epics by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<GroupListDropDown groupsInfo={groupsinfo} onChange={setSelectedGroupID} />}
    >
      <List.Section
        title={searchText && searchText.length > 0 ? "Search Results" : "Recent Epics"}
        subtitle={`${epics.length}`}
      >
        {epics.map((epic) => (
          <EpicListItem key={epic.id} epic={epic} displayGroup={displayGroup} onChangeDisplayGroup={setDisplayGroup} />
        ))}
      </List.Section>
      <List.EmptyView title="No Epics found" icon={{ source: "epic.svg", tintColor: Color.PrimaryText }} />
    </List>
  );
}
