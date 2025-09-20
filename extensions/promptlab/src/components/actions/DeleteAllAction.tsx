import { Action, Alert, Icon, confirmAlert, showToast } from "@raycast/api";
import { getActionShortcut, isActionEnabled } from "../../lib/actions";
import { AdvancedSettings } from "../../data/default-advanced-settings";
import { NamedObject } from "../../lib/common/types";
import { isCommand } from "../../lib/commands/types";
import { isModel } from "../../lib/models/types";
import { deleteModel } from "../../lib/models";
import { deleteCommand } from "../../lib/commands";
import { isChat } from "../../lib/chats/types";
import { deleteChat } from "../../lib/chats";
import { itemTypeForObject } from "../../lib/common/object-utils";

type DeleteAllActionProps = {
  objects: NamedObject[];
  settings: AdvancedSettings;
  revalidateObjects: () => Promise<void> | void;
};

export default function DeleteAllAction(props: DeleteAllActionProps) {
  const { objects, settings, revalidateObjects } = props;
  if (!isActionEnabled("DeleteAllAction", settings) || objects.length === 0) {
    return null;
  }

  const objectType = itemTypeForObject(objects[0]);
  const objectTypePluralized = `${objectType}${objects.length > 1 ? "s" : ""}`;
  return (
    <Action
      title={`Delete All ${objectTypePluralized}`}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={getActionShortcut("DeleteAllAction", settings)}
      onAction={async () => {
        if (
          await confirmAlert({
            title: `Delete ${objects.length} ${objectTypePluralized}?`,
            message: "Are you sure?",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          for (const object of objects) {
            if (isCommand(object)) {
              await deleteCommand(object);
            } else if (isModel(object)) {
              await deleteModel(object);
            } else if (isChat(object)) {
              await deleteChat(object);
            }
          }

          await revalidateObjects();
          await showToast({ title: `Deleted ${objects.length} ${objectTypePluralized}` });
        }
      }}
    />
  );
}
