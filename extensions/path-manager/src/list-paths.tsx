import {
  Icon,
  Alert,
  confirmAlert,
  getPreferenceValues,
  showToast,
  Toast,
  showHUD,
  ActionPanel,
  List,
  Action,
  environment,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { promises as fs } from "fs";
import { exec } from "child_process";
import path from "path";
import PathForm from "./components/path-form";

const STORAGE_PATH: string = path.join(environment.supportPath, "paths.json");

export default function ListPaths() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [paths, setPaths] = useState<Record<string, string>>({});
  const [filteredList, setFilteredList] = useState<{ alias: string; path: string }[]>([]);

  const preferences = getPreferenceValues();
  const terminalApp = preferences.defaultTerminal === "iTerm" ? "iTerm" : "Terminal";

  async function fetchPaths() {
    try {
      const rawData = await fs.readFile(STORAGE_PATH, "utf-8");
      const parsedData: Record<string, string> = JSON.parse(rawData);
      setPaths(parsedData);
      setFilteredList(Object.entries(parsedData).map(([alias, path]) => ({ alias, path })));
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load paths",
        message: `${error}`,
      });
      setPaths({});
      setFilteredList([]);
    }
  }

  useEffect(() => {
    fetchPaths();
  }, []);

  useEffect(() => {
    const filtered = Object.entries(paths)
      .filter(([alias, path]) => alias.includes(searchText) || path.includes(searchText))
      .map(([alias, path]) => ({ alias, path }));
    setFilteredList(filtered);
  }, [searchText, paths]);

  function handleSubmit(pathValue: string) {
    // Open path location in preferred terminal
    exec(`open -a ${terminalApp} "${pathValue}"`, (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to open path in ${terminalApp}`,
          message: error.message,
        });
      } else {
        showHUD("Path opened!");
      }
    });
  }

  function handleEdit(alias: string, path: string) {
    push(
      <PathForm
        mode="edit"
        initialAlias={alias}
        initialPath={path}
        //onSubmit={updatePath}
      />
    );
  }

  async function handleDelete(alias: string) {
    const options: Alert.Options = {
      title: "Delete path?",
      icon: Icon.Trash,
      message: "Warning: this operation cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          try {
            // Remove alias from the paths object
            const updatedPaths = { ...paths };
            delete updatedPaths[alias];

            // Save the updated paths to storage
            await fs.writeFile(STORAGE_PATH, JSON.stringify(updatedPaths, null, 2), "utf-8");

            // Update the local state
            setPaths(updatedPaths);
            setFilteredList(
              Object.entries(updatedPaths).map(([alias, path]) => ({
                alias,
                path,
              }))
            );

            showToast({
              style: Toast.Style.Success,
              title: `Path deleted successfully!`,
            });
          } catch (error) {
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to delete path",
              message: `${error}`,
            });
          }
        },
      },
    };
    await confirmAlert(options);
  }

  function handleAdd() {
    push(<PathForm mode="edit" initialAlias={""} initialPath={""} />);
  }

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="List Paths"
      searchBarPlaceholder="Search your paths"
    >
      {filteredList.map(({ alias, path }) => (
        <List.Item
          key={alias}
          title={alias}
          subtitle={path}
          actions={
            <ActionPanel>
              <Action title="Open in Terminal" onAction={() => handleSubmit(path)} icon={Icon.Terminal} />
              <Action title="Edit Path" onAction={() => handleEdit(alias, path)} icon={Icon.Pencil} />
              <Action title="Create Path" onAction={() => handleAdd()} icon={Icon.Plus} />
              <Action
                title="Delete Path"
                onAction={() => handleDelete(alias)}
                style={Action.Style.Destructive}
                icon={Icon.Trash}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
