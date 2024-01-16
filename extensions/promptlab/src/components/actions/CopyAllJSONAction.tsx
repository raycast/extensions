import { Action } from "@raycast/api";
import { getActionShortcut, isActionEnabled } from "../../lib/actions";
import { AdvancedSettings } from "../../data/default-advanced-settings";
import { NamedObject } from "../../lib/common/types";
import { itemTypeForObject } from "../../lib/common/object-utils";
import { isCommand, isStoreCommand } from "../../lib/commands/types";
import { isChat } from "../../lib/chats/types";
import { isModel } from "../../lib/models/types";

type CopyAllJSONActionProps = {
  objects: NamedObject[];
  settings: AdvancedSettings;
};

export default function CopyAllJSONAction(props: CopyAllJSONActionProps) {
  const { objects, settings } = props;
  if (!isActionEnabled("CopyAllJSONAction", settings) || objects.length === 0) {
    return null;
  }

  const objectType = itemTypeForObject(objects[0]);
  const objectTypePluralized = `${objectType}${objects.length > 1 ? "s" : ""}`;

  const objectsWrapper: { [key: string]: NamedObject } = {};
  for (const object of objects) {
    let objectKey = "item";
    if (isCommand(object) || isStoreCommand(object)) {
      objectKey = object.name;
    } else if (isChat(object)) {
      objectKey = `--chat-${object.name}`;
    } else if (isModel(object)) {
      objectKey = `--model-${object.name}`;
    }
    objectsWrapper[objectKey] = object;
  }
  const content = JSON.stringify(objectsWrapper).replaceAll(/\\([^"])/g, "\\\\$1");

  return (
    <Action.CopyToClipboard
      title={`Copy JSON for All ${objectTypePluralized}`}
      content={content}
      shortcut={getActionShortcut("CopyAllJSONAction", settings)}
    />
  );
}
