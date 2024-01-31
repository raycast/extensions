import { Application, Icon, MenuBarExtra } from "@raycast/api";
import { FileRef } from "../../../lib/LocalData";
import { createNewPin } from "../../../lib/Pins";
import { Group, createNewGroup } from "../../../lib/Groups";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/constants";
import { cutoff } from "../../../lib/utils";
import { useCachedState } from "@raycast/utils";

type FilesQuickPinProps = {
  /**
   * The application that is currently open.
   */
  app: Application;

  /**
   * The files that are currently selected in Finder.
   */
  selectedFiles: FileRef[];

  /**
   * The list of all pin groups.
   */
  groups: Group[];
};

/**
 * A menu bar extra item that creates a new pin for each selected file in Finder.
 * @returns A menu bar extra item, or null if the current app is not Finder or no files are selected.
 */
export default function FilesQuickPin(props: FilesQuickPinProps) {
  const { app, selectedFiles, groups } = props;
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (app.name != "Finder" || selectedFiles.length == 0) {
    return null;
  }

  let title = `Pin ${
    selectedFiles.length > 1
      ? `These Files (${selectedFiles.length})`
      : `This File (${cutoff(selectedFiles[0].name, 20)})`
  }`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: selectedFiles[0].path }}
      tooltip="Create a pin for each selected file, pinned to a new group"
      shortcut={KEYBOARD_SHORTCUT.PIN_SELECTED_FILES}
      onAction={async () => {
        if (selectedFiles.length == 1) {
          await createNewPin(
            selectedFiles[0].name,
            selectedFiles[0].path,
            "Favicon / File Icon",
            targetGroup?.name || "None",
            "None",
            undefined,
            undefined,
            false,
            undefined,
            undefined,
            [],
            "",
          );
        } else {
          let newGroupName = "New File Group";
          if (targetGroup) {
            newGroupName = targetGroup.name;
          } else {
            let iter = 2;
            while (groups.map((group) => group.name).includes(newGroupName)) {
              newGroupName = `New File Group (${iter})`;
              iter++;
            }
            await createNewGroup(
              newGroupName,
              Object.entries(Icon).find((entry) => entry[1] == Icon.Document)?.[0] || "None",
            );
          }
          for (const file of selectedFiles) {
            await createNewPin(
              file.name,
              file.path,
              "Favicon / File Icon",
              newGroupName,
              "None",
              undefined,
              undefined,
              false,
              undefined,
              undefined,
              [],
              "",
            );
          }
        }
      }}
    />
  );
}
