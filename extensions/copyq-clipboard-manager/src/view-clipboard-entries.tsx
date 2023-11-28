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
import { execSync } from "child_process";

interface ExtensionPreferences {
  copyq_path: string;
  default_tab: string;
}

export default function Command() {
  // Handles preferences of the extension
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const copyqPath = getPreferenceValues<ExtensionPreferences>().copyq_path;

  // Set the selected tab to preferences value if not passed from launchCommand
  const selectedTab = environment.launchContext?.selectedTab ?? preferences.default_tab;

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

  // Define a function to get clipboard contents and return an array of text
  function getClipboardContents(tab: string) {
    const command = `${copyqPath} tab ${tab} 'JSON.stringify(ItemSelection().select(/./).itemsFormat(mimeText).map(function(x){return str(x)}))'`;
    const stdout = execSync(command, { encoding: "utf8" });

    const jsonArray = JSON.parse(stdout);
    const outputArray: string[] = jsonArray.map((item: string) => item);

    return outputArray;
  }

  // Define a function to select clipboard contents by row
  function selectClipboardContents(tab: string, index: number) {
    const command = `${copyqPath} tab ${tab} select ${index}`;
    execSync(command);
  }

  // Get clipboard contents
  const clipboardContents = getClipboardContents(selectedTab);

  return (
    <List isShowingDetail>
      {clipboardContents.map((text, index) => (
        <List.Item
          key={index}
          title={text}
          actions={
            <ActionPanel>
              <Action
                title="Paste"
                icon={Icon.Clipboard}
                onAction={() => {
                  selectClipboardContents(selectedTab, index);
                  Clipboard.paste({ text });
                }}
              />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={text} />}
        />
      ))}
    </List>
  );
}
