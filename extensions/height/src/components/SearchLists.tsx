import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import useLists from "../hooks/useLists";
import { ListObject } from "../types/list";
import { getTintColorFromHue, ListColors, ListTypes } from "../utils/list";
import SearchTasks from "./SearchTasks";
import UpdateList from "./UpdateList";

export default function SearchLists() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState<string>("");
  const [listType, setListType] = useState("list");
  const [filteredList, filterList] = useState<ListObject[]>([]);

  const { listsData, listsIsLoading, listsMutate } = useLists();

  useEffect(() => {
    if (!listsData) return;
    filterList(
      listsData.filter(
        (item) =>
          item.type === listType &&
          item.archivedAt === null &&
          item.name.toLowerCase().includes(searchText.toLowerCase())
      )
    );
  }, [searchText, listsData, listType]);

  return (
    <List
      isLoading={listsIsLoading}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Lists"
      searchBarPlaceholder="Search your favorite list"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select List Type"
          storeValue={true}
          onChange={(newValue) => {
            setListType(newValue);
          }}
        >
          {ListTypes.map((item) => (
            <List.Dropdown.Item key={item.value} title={item.name} value={item.value} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredList.map((item) => (
        <List.Item
          key={item.id}
          icon={{
            source: item.appearance?.iconUrl ?? "list-icons/list-light.svg",
            tintColor: getTintColorFromHue(item?.appearance?.hue, ListColors),
          }}
          title={item.name}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Show Tasks" icon={Icon.List} onAction={() => push(<SearchTasks listId={item.id} />)} />
                <Action.OpenInBrowser title="Open List in Browser" url={item.url} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Create List"
                  icon={Icon.NewDocument}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={async () => {
                    await launchCommand({ name: "create_list", type: LaunchType.UserInitiated });
                  }}
                />
                <Action
                  title="Edit List"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() => push(<UpdateList list={item} mutateList={listsMutate} />)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy List Name"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  icon={Icon.CopyClipboard}
                  content={item.name}
                />
                <Action.CopyToClipboard
                  title="Copy List URL"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  icon={Icon.CopyClipboard}
                  content={item.url}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
