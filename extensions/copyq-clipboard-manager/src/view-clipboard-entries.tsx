import {
  ActionPanel,
  Detail,
  List,
  Action,
  getPreferenceValues,
  Icon,
  Clipboard,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { accessSync, constants } from "fs";

interface ExtensionPreferences {
  copyq_path: string;
  default_tab: string;
  default_num_items: number;
}

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const copyqPath = preferences.copyq_path;
  const defaultTab = preferences.default_tab;
  let defaultNumItems = preferences.default_num_items;

  // Check if CopyQ is installed
  try {
    accessSync(copyqPath, constants.X_OK);
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
              <Action.Paste title="Copy Path to Clipboard" content={copyqPath} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Define a function that gets the amount of items in the tab
  function getNumItems(): Promise<number> {
    return new Promise((resolve, reject) => {
      const command = `"${copyqPath}" tab ${defaultTab} count`;
      exec(command, (error, stdout) => {
        if (error) {
          // Typically occurs when CopyQ path is incorrect or not installed.
          console.log(`error: ${error.message}`);
          reject(error);
        } else {
          resolve(parseInt(stdout, 10));
        }
      });
    });
  }

  // Utilize the getNumItems function to check the number of items in the tab
  async function checkNumItems() {
    const numItems = await getNumItems();
    // Ensure that defaultNumItems is less than or equal to the number of items in the tab
    if (defaultNumItems > numItems) {
      defaultNumItems = numItems;
    }
  }
  checkNumItems();

  const [clipboardContents, setClipboardContents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function storeClipboardContents(tab: string, numItems: number) {
    setIsLoading(true);
    const promises: Promise<string>[] = [];

    for (let i = 0; i < numItems; i++) {
      const command = `"${copyqPath}" tab ${tab} read ${i}`;
      const promise = new Promise<string>((resolve, reject) => {
        exec(command, (error, stdout) => {
          if (error) {
            //Typically occurs when CopyQ path is incorrect or not installed.
            console.log(`error: ${error.message}`);
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });

      promises.push(promise);
    }

    const results = await Promise.all(promises);
    setClipboardContents(results);
    setIsLoading(false);
  }

  function selectClipboardContents(tab: string, index: number) {
    const command = `${copyqPath} tab ${tab} select ${index}`;
    exec(command);
  }

  useEffect(() => {
    async function fetchData() {
      await checkNumItems();
      storeClipboardContents(defaultTab, defaultNumItems);
    }

    fetchData();
  }, [defaultTab, defaultNumItems]);

  const items = clipboardContents.map((text, index) => (
    <List.Item
      key={index}
      title={text}
      actions={
        <ActionPanel>
          <Action
            title="Paste"
            icon={Icon.Clipboard}
            onAction={async () => {
              await selectClipboardContents(defaultTab, index);
              Clipboard.paste({ text });
            }}
          />
          <Action.Push title="Preview" icon={Icon.ArrowsExpand} target={<Detail markdown={text} />} />
        </ActionPanel>
      }
    />
  ));

  return <List isLoading={isLoading}>{items}</List>;
}
