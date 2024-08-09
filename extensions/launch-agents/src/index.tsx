import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";

const getRecurrence = (filePath: string) => {
  const plistContent = execSync(`cat ${filePath}`).toString();
  const intervalMatch = plistContent.match(/<key>StartInterval<\/key>\s*<integer>(\d+)<\/integer>/);

  if (intervalMatch) {
    const seconds = parseInt(intervalMatch[1]);
    if (seconds >= 3600) {
      const hours = (seconds / 3600).toFixed(2);
      return `Recurs every ${hours} hour${hours === "1.00" ? "" : "s"}`;
    }
    if (seconds >= 60) {
      const minutes = (seconds / 60).toFixed(2);
      return `Recurs every ${minutes} minute${minutes === "1.00" ? "" : "s"}`;
    }
    return `Recurs every ${seconds} second${seconds === 1 ? "" : "s"}`;
  }

  const calendarIntervalMatch = [...plistContent.matchAll(/<key>Weekday<\/key>\s*<integer>(\d)<\/integer>/g)];
  if (calendarIntervalMatch.length > 0) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const daysOfWeek = calendarIntervalMatch.map((match) => dayNames[parseInt(match[1])]);
    return `Recurs on weekdays: ${daysOfWeek.join(", ")}`;
  }

  return "No recurrence information";
};

const isPListOK = (filePath: string) => {
  try {
    return execSync(`plutil -lint ${filePath}`).toString().includes("OK");
  } catch {
    return false;
  }
};

const getFileName = (filepath: string) => filepath.split("/").pop() || "";

function LaunchAgentDetails({ selectedFile, refreshList }: { selectedFile: string; refreshList: () => void }) {
  const { pop } = useNavigation();
  const [isFileLoaded, setIsFileLoaded] = useState<boolean>(false);

  const fileName = getFileName(selectedFile);
  const isFileValid = isPListOK(selectedFile);
  const recurrence = getRecurrence(selectedFile);

  const markdown = `
# ${fileName}

## Details

| Property                | Value                           |
|-------------------------|---------------------------------|
| Valid                   | ${isFileValid ? "✅" : "❌"}     |
| Loaded                  | ${isFileLoaded ? "✅" : "❌"}    |  
| Recurrence              | ${recurrence}                   |
| File Path               | ${selectedFile}                 |
`;

  const isFileCurrentlyLoaded = (file: string) => {
    try {
      const result = execSync(`launchctl list | grep $(basename ${file} .plist)`, { stdio: "pipe" });
      return result.toString().trim() !== ""; // If there's output, it's loaded
    } catch {
      return false; // If the command fails, it's not loaded
    }
  };

  const updateIsFileLoaded = () => {
    try {
      const output = isFileCurrentlyLoaded(selectedFile);
      setIsFileLoaded(output);
    } catch {
      setIsFileLoaded(false);
    }
  };

  const confirmDeleteFile = async () => {
    await confirmAlert({
      title: "Confirm Deletion",
      message: `Are you sure you want to delete ${selectedFile}? This action cannot be undone.`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: deleteFile,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });
  };

  const deleteFile = () => {
    try {
      execSync(`rm ${selectedFile}`);
      showToast(Toast.Style.Success, "File Deleted", `${selectedFile} has been deleted.`);
      refreshList();
      pop();
    } catch (error) {
      console.error("Error deleting file:", error);
      showToast(Toast.Style.Failure, "Error", "Failed to delete the file.");
    }
  };

  const loadOrUnloadFile = () => {
    try {
      if (isFileLoaded) {
        execSync(`launchctl unload ${selectedFile}`);

        updateIsFileLoaded();

        if (isFileCurrentlyLoaded(selectedFile)) {
          showToast(Toast.Style.Failure, "Error", "Failed to unload the file.");
        } else {
          showToast(Toast.Style.Success, "Unloaded", `${selectedFile} has been loaded.`);
        }
      } else {
        execSync(`launchctl load ${selectedFile}`);

        updateIsFileLoaded();

        if (isFileCurrentlyLoaded(selectedFile)) {
          showToast(Toast.Style.Success, "Loaded", `${selectedFile} has been loaded.`);
        } else {
          showToast(Toast.Style.Failure, "Error", "Failed to load the file.");
        }
      }
    } catch (error) {
      console.error("Error loading/unloading file:", error);
      showToast(Toast.Style.Failure, "Error", "Failed to load/unload the file.");
    }
  };

  useEffect(() => {
    updateIsFileLoaded();
  }, [selectedFile]);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            icon={isFileLoaded ? Icon.Stop : Icon.Play}
            title={isFileLoaded ? "Unload" : "Load"}
            onAction={loadOrUnloadFile}
          />
          <Action icon={Icon.Folder} title="Open" onAction={() => execSync(`code ${selectedFile}`)} />
          <Action
            title="Remove"
            icon={Icon.Trash}
            shortcut={Keyboard.Shortcut.Common.Remove}
            style={Action.Style.Destructive}
            onAction={confirmDeleteFile}
          />
        </ActionPanel>
      }
    />
  );
}

const EmptyView = () => (
  <List.EmptyView
    icon={Icon.Multiply}
    title="No Launch Agents found"
    actions={
      <ActionPanel title="Manage Launch Agents">
        <Action
          icon={{ source: Icon.NewDocument, tintColor: Color.Green }}
          title="Create Launch Agent"
          onAction={() => {
            const fileName = `com.raycast.${Math.random()}`;
            execSync(`touch ~/Library/LaunchAgents/${fileName}.plist`);
          }}
        />
      </ActionPanel>
    }
  />
);

export default function Command() {
  const [plistFiles, setPlistFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadPlistFiles = () => {
    try {
      const plistOutput = execSync("ls ~/Library/LaunchAgents/*.plist").toString();
      const files = plistOutput.split("\n").filter((file) => file.trim() !== "");
      setPlistFiles(files);
    } catch (error) {
      console.error("Error fetching plist files:", error);
    }
  };

  useEffect(() => {
    loadPlistFiles();
    setIsLoading(false);
  }, []);

  return (
    <List navigationTitle="Search Launch Agents" searchBarPlaceholder="Search your Launch Agent" isLoading={isLoading}>
      <EmptyView />
      {plistFiles.map((file, index) => (
        <List.Item
          key={index}
          title={getFileName(file)}
          icon={{ source: Icon.Rocket, tintColor: Color.Yellow }}
          actions={
            <ActionPanel>
              <Action.Push
                icon={{ source: Icon.Mouse, tintColor: Color.Green }}
                title="View Details"
                target={<LaunchAgentDetails selectedFile={file} refreshList={loadPlistFiles} />}
              />
              <Action
                icon={{ source: Icon.NewDocument, tintColor: Color.Green }}
                title="Create Launch Agent"
                onAction={() => {
                  const fileName = `com.raycast.${Math.random()}`;
                  execSync(`touch ~/Library/LaunchAgents/${fileName}.plist`);
                  loadPlistFiles();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
