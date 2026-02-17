import {
  Action,
  ActionPanel,
  List,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  popToRoot,
  showToast,
  useNavigation,
  LocalStorage,
  Form,
  Icon,
  openExtensionPreferences,
  LaunchProps,
  environment,
} from "@raycast/api";
import { useEffect, useState } from "react";
import * as fs from "fs";
import { ScriptItem, loadScripts, LoadedScript } from "./utils/script-loader";

interface Preferences {
  scriptsDirectory?: string;
}

interface CommandArguments {
  scriptName?: string;
}

function SetDirectoryForm({ onSet }: { onSet: (path: string) => void }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Directory"
            onSubmit={(values) => {
              // Prefer picker if available
              const path =
                values.picker && values.picker.length > 0
                  ? values.picker[0]
                  : values.path;

              if (path) {
                onSet(path);
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="picker"
        title="Select Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        info="Choose the folder containing your scripts"
      />
      <Form.Separator />
      <Form.TextField
        id="path"
        title="Or Enter Path Manually"
        placeholder="/path/to/your/scripts"
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}

// 1800 8969999
export default function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  const preferences = getPreferenceValues<Preferences>();
  const [scripts, setScripts] = useState<LoadedScript[]>([]);
  const [customDirectory, setCustomDirectory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function init() {
      // 1. Try to get from LocalStorage
      const localDir = await LocalStorage.getItem<string>(
        "customScriptsDirectory",
      );

      // 2. Decide which directory to use (simpler logic: prefer local storage if set, else prefs)
      // If localDir matches prefs, good. If localDir exists, use it.
      // If no localDir, use prefs.
      const dirToUse = localDir || preferences.scriptsDirectory;

      let loadedLists: LoadedScript[] = [];
      if (dirToUse && fs.existsSync(dirToUse)) {
        setCustomDirectory(dirToUse);
        loadedLists = loadScripts(dirToUse);
        setScripts(loadedLists);
      }

      // Check for launch argument to open specific script
      if (props.arguments.scriptName && loadedLists.length > 0) {
        const requestedScript = props.arguments.scriptName.toLowerCase();
        const found = loadedLists.find(
          (s) =>
            s.name.toLowerCase() === requestedScript ||
            s.filename.toLowerCase() === requestedScript,
        );

        if (found) {
          push(<WorkflowView script={found} />);
        }
      }

      setIsLoading(false);
    }
    init();
  }, [preferences.scriptsDirectory]);

  const handleSetDirectory = async (path: string) => {
    // Basic cleanup of path
    const cleanPath = path.trim();
    if (fs.existsSync(cleanPath)) {
      await LocalStorage.setItem("customScriptsDirectory", cleanPath);
      setCustomDirectory(cleanPath);
      const loaded = loadScripts(cleanPath);
      setScripts(loaded);
      showToast(Toast.Style.Success, "Directory Updated");
    } else {
      showToast(Toast.Style.Failure, "Directory does not exist");
    }
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  const activeDirectory = customDirectory || preferences.scriptsDirectory;
  // Check if directory exists
  const isConfigured = activeDirectory && fs.existsSync(activeDirectory);

  if (!isConfigured) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Folder }}
          title="Configuration Required"
          description={
            activeDirectory
              ? `Directory not found: ${activeDirectory}`
              : "Please set a Scripts Directory to start."
          }
          actions={
            <ActionPanel>
              <Action
                title="Set Scripts Directory"
                icon={Icon.Folder}
                onAction={() =>
                  push(<SetDirectoryForm onSet={handleSetDirectory} />)
                }
              />
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder="Select a workflow..."
      actions={
        <ActionPanel>
          <Action
            title="Change Scripts Directory"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            onAction={() =>
              push(<SetDirectoryForm onSet={handleSetDirectory} />)
            }
          />
        </ActionPanel>
      }
    >
      {scripts.length === 0 ? (
        <List.EmptyView
          icon={{ source: "list-icon" }}
          title="No scripts found"
          description={`No .js files found in ${activeDirectory}`}
          actions={
            <ActionPanel>
              <Action
                title="Change Scripts Directory"
                icon={Icon.Folder}
                onAction={() =>
                  push(<SetDirectoryForm onSet={handleSetDirectory} />)
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        scripts.map((script) => (
          <List.Item
            key={script.filename}
            title={script.name}
            subtitle={script.filename}
            actions={
              <ActionPanel>
                <Action
                  title="Open Workflow"
                  onAction={() => push(<WorkflowView script={script} />)}
                />
                <Action.CreateQuicklink
                  title="Create Quicklink"
                  quicklink={{
                    name: script.name,
                    link: `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/${environment.commandName}?arguments=${encodeURIComponent(JSON.stringify({ scriptName: script.filename }))}`,
                  }}
                />
                <Action
                  title="Change Scripts Directory"
                  icon={Icon.Folder}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  onAction={() =>
                    push(<SetDirectoryForm onSet={handleSetDirectory} />)
                  }
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function WorkflowView({ script }: { script: LoadedScript }) {
  const [items, setItems] = useState<ScriptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setIsLoading(true);
    try {
      // Support both fetch and retrieve
      const fetchFunction = script.module.fetch || script.module.retrieve;
      if (fetchFunction) {
        // Handle both promise and direct return
        const result = await fetchFunction();
        console.log(result);
        if (Array.isArray(result)) {
          setItems(result);
        } else {
          console.warn("Script returned non-array result", result);
          setItems([]);
        }
      }
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error fetching items",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAction(item: ScriptItem) {
    try {
      await script.module.doActions(item);
      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Action failed",
        message: String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${script.name}...`}
    >
      {items.map((item, index) => {
        // Try to generate a useful subtitle from other properties
        const subtitle = Object.entries(item)
          .filter(([k, v]) => k !== "name" && typeof v === "string")
          .map(([, v]) => v) // Ignore key with comma syntax if unused
          .join(" | ");
        return (
          <List.Item
            key={index} // Ideally item would have an ID, but index is fallback
            title={item.name || "Unknown"}
            subtitle={subtitle}
            actions={
              <ActionPanel>
                <Action title="Select" onAction={() => handleAction(item)} />
                <Action
                  title="Refresh List"
                  onAction={loadItems}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
