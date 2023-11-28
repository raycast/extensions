import {
  openExtensionPreferences,
  getPreferenceValues,
  ActionPanel,
  List,
  Action,
  Icon,
  launchCommand,
  LaunchType,
  Detail,
} from "@raycast/api";
import { execSync } from "child_process";

interface ExtensionPreferences {
  copyq_path: string;
}

export default function Command() {
  // Get CopyQ path from preferences
  const copyqPath = getPreferenceValues<ExtensionPreferences>().copyq_path;

  // Error handling for missing CopyQ path and CopyQ not running
  try {
    execSync(`${copyqPath} tab`, { encoding: "utf8" });
  } catch (err) {
    return (
      <Detail
        markdown={
          "CopyQ not found, or CopyQ server not running\n\nPlease check your CopyQ path in preferences, and make sure CopyQ server is running."
        }
        actions={
          <ActionPanel>
            <Action title="Open Command Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
            <Action.Paste title="Copy Path to Clipboard" content={copyqPath} />
          </ActionPanel>
        }
      />
    );
  }

  // Get the list of tabs from CopyQ and return an array of strings
  function getTabs(): string[] {
    const command = `"${copyqPath}" tab`;
    const stdout = execSync(command, { encoding: "utf8" });

    // Format list of tabs from string to array
    const lines = stdout.split("\n");
    const formattedList = lines.filter((line) => line.trim() !== "");
    // Remove & from items in the list
    formattedList.forEach((item, index) => {
      formattedList[index] = item.replace("&", "");
    });

    return formattedList;
  }

  // Return the list of tabs
  const tabList = getTabs();

  return (
    <List>
      {tabList.map((text, index) => (
        <List.Item
          key={index}
          title={text}
          actions={
            <ActionPanel>
              <Action
                title="Select Tab"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await launchCommand({
                    name: "view-clipboard-entries",
                    type: LaunchType.UserInitiated,
                    context: { selectedTab: `${text}` },
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
