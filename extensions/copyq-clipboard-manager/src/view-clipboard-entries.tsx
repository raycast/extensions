import {
  getPreferenceValues,
  openExtensionPreferences,
  environment,
  List,
  Icon,
  ActionPanel,
  Action,
  Clipboard,
  Detail,
} from "@raycast/api";
import { execSync, ExecSyncOptionsWithStringEncoding } from "child_process";
import { accessSync, constants } from "fs";

interface ExtensionPreferences {
  copyq_path: string;
  default_tab: string;
  max_items: number;
}

interface ClipboardItem {
  row: number;
  mimetypes: string[];
  text: string;
}

export default function Command() {
  // Handles preferences of the extension
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const copyqPath = getPreferenceValues<ExtensionPreferences>().copyq_path;

  // Set the default tab to preferences value if not passed from launchCommand
  const selectedTab = environment.launchContext?.selectedTab;
  const defaultTab = selectedTab !== undefined ? selectedTab : preferences.default_tab;

  const maxItems = preferences.max_items;

  // Define a function to get the amount of items in a tab
  function numItems(tab: string) {
    const command = `${copyqPath} tab ${tab} count`;
    const stdout = execSync(command);
    const numTabs = parseInt(stdout.toString());
    return numTabs;
  }

  // Check if CopyQ is installed
  try {
    accessSync(copyqPath, constants.X_OK);
  } catch (err) {
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

  // Define a function to get clipboard contents and return an array of [row, text]
  function getClipboardContents(tab: string) {
    // Determine correct amount of items to show
    let amntItems = String(maxItems); // Displays maxItems items in the tab
    if (maxItems > numItems(tab)) {
      amntItems = String(numItems(tab)); // Does not display more items than there are in the tab
    } else if (maxItems === 0) {
      amntItems = "size()"; // Displays all items in the tab
    }

    // Define an ECMAScript to get clipboard contents
    const script: string = `
    tab('${tab}');
    var result=[];
    for ( var i = 0; i < ${amntItems}; ++i ) {
        var obj = {} as Item;
        obj.row = i;
        obj.mimetypes = str(read("?", i)).split("\\n");
        obj.mimetypes.pop();
        obj.text = str(read(i));
        result.push(obj);
    }
    JSON.stringify(result);
    `;

    const command: string = `"${copyqPath}" eval -`;
    const options: ExecSyncOptionsWithStringEncoding = {
      input: script,
      encoding: "utf8",
    };

    const stdout = execSync(command, options);
    const jsonString = stdout.match(/\[.*\]/s); // Extract the JSON array part
    const jsonArr = JSON.parse(jsonString![0]); // Parse the JSON array

    // Return an array of [row, text]
    const outputArray: Array<[number, string]> = jsonArr.map((item: ClipboardItem) => [item.row, item.text]);

    return outputArray;
  }

  // Define a function to select clipboard contents by row
  function selectClipboardContents(tab: string, index: number) {
    const command = `${copyqPath} tab ${tab} select ${index}`;
    execSync(command);
  }

  // Get clipboard contents
  const clipboardContents = getClipboardContents(defaultTab);

  return (
    <List>
      {clipboardContents.map(([row, text], index) => (
        <List.Item
          key={index}
          title={text}
          actions={
            <ActionPanel>
              <Action
                title="Paste"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await selectClipboardContents(defaultTab, row);
                  Clipboard.paste({ text });
                }}
              />

              <Action.Push title="Preview" icon={Icon.ArrowsExpand} target={<Detail markdown={text} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
