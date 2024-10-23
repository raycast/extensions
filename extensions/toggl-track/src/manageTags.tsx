import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";

import type { Workspace } from "@/api";
import TagForm from "@/components/TagForm";
import TagListItem from "@/components/TagListItem";
import { ExtensionContextProvider } from "@/context/ExtensionContext";
import { canModifyTagsIn } from "@/helpers/privileges";
import Shortcut from "@/helpers/shortcuts";
import { useWorkspaces, useTags, useGroups } from "@/hooks";

function ManageTags() {
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();
  const { tags, isLoadingTags, revalidateTags } = useTags();
  const groupedTags = useGroups(tags, "workspace_id");

  const [searchFilter, setSearchFilter] = useState<Workspace>();

  const tagAdminWorkspaces = workspaces.filter(canModifyTagsIn);
  const SharedActions = tagAdminWorkspaces && (
    <Action.Push
      title="Create New Tag"
      icon={Icon.Plus}
      shortcut={Shortcut.New}
      target={<TagForm revalidateTags={revalidateTags} workspaces={tagAdminWorkspaces} />}
    />
  );

  return (
    <List
      isLoading={isLoadingWorkspaces || isLoadingTags}
      actions={<ActionPanel>{SharedActions}</ActionPanel>}
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
              <TagListItem workspace={searchFilter} key={tag.id} {...{ tag, revalidateTags, SharedActions }} />
            ))}
          </List.Section>
        </>
      ) : (
        <>
          {tags.length == 0 && <List.EmptyView title="No Tags Found" />}
          {workspaces.map((workspace) => (
            <List.Section key={workspace.id} title={workspace.name}>
              {groupedTags[workspace.id]?.map((tag) => (
                <TagListItem workspace={workspace} key={tag.id} {...{ tag, revalidateTags, SharedActions }} />
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
