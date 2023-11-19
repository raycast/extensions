import {
  ActionPanel,
  List,
  Action,
  Icon,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { exec } from "child_process";
import { accessSync, constants } from "fs";
import { useState, useEffect } from "react";

interface ExtensionPreferences {
  copyq_path: string;
}

export default function Command() {
  const copyq_path = getPreferenceValues<ExtensionPreferences>().copyq_path;

  // Check if CopyQ is installed
  try {
    accessSync(copyq_path, constants.X_OK);
  } catch (err) {
    // Return error message
    return (
      <List>
        <List.Item
          title="CopyQ not found"
          subtitle="Please check your CopyQ path in preferences."
          actions={
            <ActionPanel>
              <Action title="Open Command Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
              <Action.Paste title="Copy Path to Clipboard" content={copyq_path} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Get list of tabs
  const [tabList, setTabList] = useState<string[]>([]);

  function showtabs(): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = `"${copyq_path}" tab`;
      exec(command, (error, stdout) => {
        if (error) {
          console.log(`error: ${error.message}`);
          reject(error.message);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  // Format list of tabs from string to array
  function formatList(input: string): string[] {
    const lines = input.split("\n");
    const formattedList = lines.filter((line) => line.trim() !== "");
    // Remove & from items in the list
    formattedList.forEach((item, index) => {
      formattedList[index] = item.replace("&", "");
    });
    return formattedList;
  }

  // Get list of tabs on mount
  useEffect(() => {
    showtabs()
      .then((tabList) => {
        setTabList(formatList(tabList));
      })
      .catch((error) => {
        console.error("Error getting tab list:", error);
      });
  }, []); // Empty dependency array to run once when the component mounts

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
