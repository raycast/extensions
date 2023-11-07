import { ActionPanel, Detail, List, Action, getPreferenceValues, Icon, Clipboard } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";

interface Preferences {
  copyq_path: string;
  default_tab: string;
  default_num_items: number;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const copyqPath = preferences.copyq_path;
  const defaultTab = preferences.default_tab;
  const defaultNumItems = preferences.default_num_items;

  const [clipboardContents, setClipboardContents] = useState<string[]>([]);

  async function storeClipboardContents(tab: string, numItems: number) {
    const promises: Promise<string>[] = [];

    for (let i = 0; i < numItems; i++) {
      const command = `"${copyqPath}" tab ${tab} read ${i}`;
      const promise = new Promise<string>((resolve, reject) => {
        exec(command, (error, stdout) => {
          if (error) {
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
  }

  function selectClipboardContents(tab: string, index: number) {
    const command = `${copyqPath} tab ${tab} select ${index}`;
    exec(command);
  }

  useEffect(() => {
    storeClipboardContents(defaultTab, defaultNumItems);
  }, [defaultTab, defaultNumItems]);

  const items = clipboardContents.map((text, index) => (
    <List.Item
      key={index}
      title={text} // Use the string content
      actions={
        <ActionPanel>
          <Action
            title="Paste"
            icon={Icon.Clipboard}
            onAction={async () => {
              await selectClipboardContents(defaultTab, index);
              Clipboard.paste({text})
            }}
          />
          <Action.Push title="Preview" icon={Icon.ArrowsExpand} target={<Detail markdown={text} />} />
        </ActionPanel>
      }
    />
  ));

  return (
    <List>
      {items}
    </List>
  );
}
