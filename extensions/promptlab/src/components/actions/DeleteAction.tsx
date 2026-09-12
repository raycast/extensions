import { Action, Alert, Icon, confirmAlert, showToast } from "@raycast/api";
import { getActionShortcut, isActionEnabled } from "../../lib/actions";
import { AdvancedSettings } from "../../data/default-advanced-settings";
import { IdentifiableObject, NamedObject } from "../../lib/common/types";
import { isCommand, isCommandRun } from "../../lib/commands/types";
import { isModel } from "../../lib/models/types";
import { deleteModel } from "../../lib/models";
import { deleteCommand, deleteCommandRun } from "../../lib/commands";
import { isChat } from "../../lib/chats/types";
import { deleteChat } from "../../lib/chats";
import { itemTypeForObject } from "../../lib/common/object-utils";

type DeleteActionProps = {
  object: NamedObject | IdentifiableObject;
  settings: AdvancedSettings;
  revalidateObjects: () => Promise<void> | void;
};

export default function DeleteAction(props: DeleteActionProps) {
  const { object, settings, revalidateObjects } = props;
  if (!isActionEnabled("DeleteAction", settings)) {
    return null;
  }

  const objectType = itemTypeForObject(object);
  return (
    <Action
      title={`Delete ${objectType}`}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={getActionShortcut("DeleteAction", settings)}
      onAction={async () => {
        if (
          await confirmAlert({
            title: `Delete ${objectType} '${"name" in object ? object.name : object.id}'`,
            message: "Are you sure?",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          if (isCommand(object)) {
            await deleteCommand(object);
          } else if (isCommandRun(object)) {
            await deleteCommandRun(object);
          } else if (isModel(object)) {
            await deleteModel(object);
          } else if (isChat(object)) {
            await deleteChat(object);
          }

          await revalidateObjects();
          await showToast({ title: `Deleted ${objectType}` });
        }
      }}
    />
  );
}
