import { useState } from "react";
import { List } from "@raycast/api";
import { ExtensionContextProvider } from "./context/ExtensionContext";
import { useWorkspaces, useTags, useGroups } from "./hooks";
import type { Workspace } from "./api";
import TagListItem from "./components/TagListItem";

function ManageTags() {
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();
  const { tags, isLoadingTags, revalidateTags } = useTags();
  const groupedTags = useGroups(tags, "workspace_id");

  const [searchFilter, setSearchFilter] = useState<Workspace>();

  return (
    <List
      isLoading={isLoadingWorkspaces || isLoadingTags}
      searchBarAccessory={
        workspaces.length < 2 ? undefined : (
          <List.Dropdown
            tooltip="Filter Tags"
            onChange={(idStr) => setSearchFilter(idStr ? workspaces.find((w) => w.id.toString() === idStr) : undefined)}
          >
            <List.Dropdown.Item title="All" value="" />
            <List.Dropdown.Section>
              {workspaces.map((workspace) => (
                <List.Dropdown.Item key={workspace.id} title={workspace.name} value={workspace.id.toString()} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
    >
      {searchFilter ? (
        <>
          {groupedTags[searchFilter.id]?.length == 0 && <List.EmptyView title="No Tags Found" />}
          <List.Section key={searchFilter.id} title={searchFilter.name}>
            {groupedTags[searchFilter.id]?.map((tag) => (
              <TagListItem workspace={searchFilter} key={tag.id} {...{ tag, revalidateTags, workspaces }} />
            ))}
          </List.Section>
        </>
      ) : (
        <>
          {tags.length == 0 && <List.EmptyView title="No Tags Found" />}
          {workspaces.map((workspace) => (
            <List.Section key={workspace.id} title={workspace.name}>
              {groupedTags[workspace.id]?.map((tag) => (
                <TagListItem workspace={workspace} key={tag.id} {...{ tag, revalidateTags, workspaces }} />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

export default function Command() {
  return (
    <ExtensionContextProvider>
      <ManageTags />
    </ExtensionContextProvider>
  );
}
