import { Action, ActionPanel, Icon, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { addObjectsToList } from "../../api";
import { useSearch } from "../../hooks";
import { AddObjectsToListRequest } from "../../models";
import { bundledTypeKeys } from "../../utils";

interface ListSubmenuProps {
  spaceId: string;
  objectId: string;
}

export function ListSubmenu({ spaceId, objectId }: ListSubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { objects: lists, isLoadingObjects } = useSearch(spaceId, searchText, [bundledTypeKeys.collection], {
    execute: isOpen,
  });
  const filteredLists = lists.filter((list) => list.id !== objectId);

  async function handleAddToList(listId: string) {
    await showToast({ style: Toast.Style.Animated, title: `Adding to list…` });
    try {
      const request: AddObjectsToListRequest = { objects: [objectId] };
      await addObjectsToList(spaceId, listId, request);
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
      onOpen={() => setIsOpen(true)}
      isLoading={isLoadingObjects}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {filteredLists.map((list) => (
        <Action key={list.id} title={list.name} icon={list.icon} onAction={() => handleAddToList(list.id)} />
      ))}
    </ActionPanel.Submenu>
  );
}
