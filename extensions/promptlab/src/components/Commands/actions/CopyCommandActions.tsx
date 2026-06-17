import { Action, ActionPanel, Icon, LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { ExtensionPreferences } from "../../../lib/preferences/types";
import { Command, StoreCommand, isCommand } from "../../../lib/commands/types";
import path from "path";
import * as fs from "fs";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { anyActionsEnabled, getActionShortcut, isActionEnabled } from "../../../lib/actions";
import CopyJSONAction from "../../actions/CopyJSONAction";
import CopyIDAction from "../../actions/CopyIDAction";

/**
 * Action panel section for actions related to copying command data to the clipboard.
 */
export const CopyCommandActionsSection = (props: {
  command: Command | StoreCommand;
  settings: typeof defaultAdvancedSettings;
  showTitle?: boolean;
}) => {
  const { command, showTitle, settings } = props;

  if (
    !anyActionsEnabled(
      ["CopyCommandPromptAction", "CopyJSONAction", "CopyIDAction", "ExportAllCommandsAction"],
      settings,
    )
  ) {
    return null;
  }

  return (
    <ActionPanel.Section title={showTitle == false ? undefined : "Copy Actions"}>
      {isActionEnabled("CopyCommandPromptAction", settings) ? (
        <Action.CopyToClipboard
          title="Copy Prompt"
          content={command.prompt}
          shortcut={getActionShortcut("CopyCommandPromptAction", settings)}
        />
      ) : null}
      {isCommand(command) ? <CopyIDAction object={command} settings={settings} /> : null}
      <CopyJSONAction object={command} settings={settings} />
      {isCommand(command) && isActionEnabled("ExportAllCommandsAction", settings) ? <ExportAllCommandsAction /> : null}
    </ActionPanel.Section>
  );
};

/**
 * Action to copy a JSON representation of all commands to the clipboard.
 */
export const ExportAllCommandsAction = () => {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  return (
    <Action
      title="Export All Commands"
      icon={Icon.CopyClipboard}
      shortcut={getActionShortcut("ExportAllCommandsAction", defaultAdvancedSettings)}
      onAction={async () => {
        const toast = await showToast({ title: "Exporting Commands", style: Toast.Style.Animated });

        const items = await LocalStorage.allItems();
        delete items["--defaults-installed"];
        const identifiers = Object.keys(items).filter((key) => key.startsWith("id-") || key.startsWith("--"));
        identifiers.forEach((identifier) => {
          delete items[identifier];
        });

        const fileName = "promptlab-commands";
        let filePath = path.resolve(preferences.exportLocation, fileName);
        let i = 2;
        while (fs.existsSync(filePath + ".json")) {
          filePath = path.resolve(preferences.exportLocation, fileName + "-" + i);
          i += 1;
        }

        fs.writeFile(filePath + ".json", JSON.stringify(items), (err) => {
          if (err) {
            toast.style = Toast.Style.Failure;
            toast.title = "Error";
            toast.message = "Couldn't export commands";
            throw err;
          }

          toast.style = Toast.Style.Success;
          toast.title = "Successfully Exported Commands";
        });
      }}
    />
  );
};
