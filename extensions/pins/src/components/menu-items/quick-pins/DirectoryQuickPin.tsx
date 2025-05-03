import { Application, MenuBarExtra } from "@raycast/api";
import { FileRef } from "../../../lib/LocalData";
import { cutoff } from "../../../lib/utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/constants";
import { createNewPin } from "../../../lib/Pins";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";

type DirectoryQuickPinProps = {
  /**
   * The application that is currently open.
   */
  app: Application;

  /**
   * The directory that is currently open in Finder.
   */
  directory: FileRef;
};

/**
 * A menu bar extra item that creates a new pin whose target path is the current directory of Finder.
 * @returns A menu bar extra item, or null if the current app is not Finder or the current directory is Desktop.
 */
export default function DirectoryQuickPin(props: DirectoryQuickPinProps) {
  const { app, directory } = props;
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (app.name != "Finder" || directory.name == "Desktop") {
    return null;
  }

  let title = `Pin This Directory (${cutoff(directory.name, 20)})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: directory.path }}
      tooltip="Create a pin whose target path is the current directory of Finder"
      shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_DIRECTORY}
      onAction={async () => {
        await createNewPin({
          name: directory.name,
          url: directory.path,
          group: targetGroup?.name || "None",
        });
      }}
    />
  );
}
