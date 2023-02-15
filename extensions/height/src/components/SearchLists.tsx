import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ApiList } from "../api/list";
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
          {ListTypes.map((listType) => (
            <List.Dropdown.Item key={listType.value} title={listType.name} value={listType.value} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredList.map((list) => (
        <List.Item
          key={list.id}
          icon={{
            source: list.appearance?.iconUrl ?? "list-icons/list-light.svg",
            tintColor: getTintColorFromHue(list?.appearance?.hue, ListColors),
          }}
          title={list.name}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Show Tasks" icon={Icon.List} onAction={() => push(<SearchTasks listId={list.id} />)} />
                <Action.OpenInBrowser title="Open List in Browser" url={list.url} />
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
                  onAction={() => push(<UpdateList list={list} mutateList={listsMutate} />)}
                />
                <Action
                  title="Archive List"
                  icon={Icon.Tray}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    await confirmAlert({
                      title: "Archive List",
                      message: "Are you sure you want to archive this list?",
                      icon: {
                        source: Icon.Tray,
                        tintColor: Color.Red,
                      },
                      primaryAction: {
                        title: "Archive",
                        style: Alert.ActionStyle.Destructive,
                        onAction: async () => {
                          const toast = await showToast({ style: Toast.Style.Animated, title: "Archiving list" });
                          try {
                            await listsMutate(ApiList.update(list.id, { archivedAt: new Date().toISOString() }));

                            toast.style = Toast.Style.Success;
                            toast.title = "Successfully archived list 🎉";
                          } catch (error) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed to archive list 😥";
                            toast.message = error instanceof Error ? error.message : undefined;
                          }
                        },
                      },
                    });
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy List Name"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  icon={Icon.CopyClipboard}
                  content={list.name}
                />
                <Action.CopyToClipboard
                  title="Copy List URL"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  icon={Icon.CopyClipboard}
                  content={list.url}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
