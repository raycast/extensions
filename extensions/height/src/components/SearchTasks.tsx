import { Action, ActionPanel, environment, Icon, launchCommand, LaunchType, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import useTasks from "../hooks/useTasks";
import { TaskObject } from "../types/task";
import { ListTypes } from "../utils/list";
import UpdateTask from "./UpdateTask";

export default function SearchTasks() {
  const { push } = useNavigation();
  const { theme } = environment;
  const [searchText, setSearchText] = useState<string>("");
  const [listType, setListType] = useState("list");
  const [filteredList, filterList] = useState<TaskObject[]>([]);

  const { tasksData, tasksIsLoading, tasksMutate } = useTasks();

  useEffect(() => {
    if (!tasksData) return;
    filterList(
      tasksData.filter((item) => item.type === listType && item.archivedAt === null && item.name.includes(searchText))
    );
  }, [searchText, tasksData, listType]);

  return (
    <List
      isLoading={tasksIsLoading}
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
            tintColor: `hsl(${item.appearance?.hue ?? "0"}, 80%, ${
              typeof item.appearance?.hue === "number" ? "60%" : theme === "dark" ? "100%" : "0"
            })`,
          }}
          title={item.name}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Mark as completed" icon={Icon.List} onAction={() => console.log(`${item} completed`)} />
                <Action.OpenInBrowser title="Open Task in Browser" url={item.url} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Create Task"
                  icon={Icon.NewDocument}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={async () => {
                    await launchCommand({ name: "create_task", type: LaunchType.UserInitiated });
                  }}
                />
                <Action
                  title="Edit Task"
                  icon={Icon.NewDocument}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() => push(<UpdateTask task={item} mutateTask={tasksMutate} />)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Task Name"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  icon={Icon.CopyClipboard}
                  content={item.name}
                />
              </ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Task URL"
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                icon={Icon.CopyClipboard}
                content={item.url}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
