import { Action, ActionPanel, Icon, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { addObjectsToList } from "../../api";
import { useSearch } from "../../hooks";
import { bundledTypeKeys } from "../../utils";

interface ListSubmenuProps {
  spaceId: string;
  objectId: string;
}

export function ListSubmenu({ spaceId, objectId }: ListSubmenuProps) {
  const [load, setLoad] = useState(false);
  const { objects: lists, isLoadingObjects } = useSearch(spaceId, "", [bundledTypeKeys.collection], { execute: load });
  const filteredLists = lists.filter((list) => list.id !== objectId);

  async function handleAddToList(listId: string) {
    await showToast({ style: Toast.Style.Animated, title: `Adding to list…` });
    try {
      await addObjectsToList(spaceId, listId, [objectId]);
      await showToast({ style: Toast.Style.Success, title: "Added to list" });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to add to list" });
    }
  }

  return (
    <ActionPanel.Submenu
      icon={Icon.PlusTopRightSquare}
      title="Add to List"
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      onOpen={() => setLoad(true)}
    >
      {filteredLists.length === 0 && isLoadingObjects ? (
        <Action title="Loading…" />
      ) : (
        filteredLists.map((list) => (
          <Action key={list.id} title={list.name} icon={list.icon} onAction={() => handleAddToList(list.id)} />
        ))
      )}
    </ActionPanel.Submenu>
  );
}
