import { Application, MenuBarExtra } from "@raycast/api";
import { FileRef } from "../../../lib/LocalData";
import { cutoff } from "../../../lib/utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/constants";
import { createNewPin } from "../../../lib/Pins";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";

type DocumentQuickPinProps = {
  /**
   * The application that is currently open.
   */
  app: Application;

  /**
   * The document that is currently open in the frontmost application.
   */
  document: FileRef;
};

/**
 * A menu bar extra item that creates a new pin whose target path is the document currently open in the frontmost application.
 * @returns A menu bar extra item, or null if there is no document open in the frontmost application.
 */
export default function DocumentQuickPin(props: DocumentQuickPinProps) {
  const { app, document } = props;
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (document.path == "") {
    return null;
  }

  let title = `Pin This Document (${cutoff(document.name, 20)})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: app.path }}
      tooltip="Create a pin whose target path is the document currently open in the frontmost application"
      shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_DOCUMENT}
      onAction={async () => {
        await createNewPin({
          name: document.name,
          url: document.path,
          group: targetGroup?.name || "None",
        });
      }}
    />
  );
}
