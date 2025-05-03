import { Action } from "@raycast/api";
import { getActionShortcut, isActionEnabled } from "../../lib/actions";
import { AdvancedSettings } from "../../data/default-advanced-settings";
import { NamedObject } from "../../lib/common/types";
import { getObjectJSON, itemTypeForObject } from "../../lib/common/object-utils";

type CopyJSONActionProps = {
  object: NamedObject;
  settings: AdvancedSettings;
};

export default function CopyJSONAction(props: CopyJSONActionProps) {
  const { object, settings } = props;
  if (!isActionEnabled("CopyJSONAction", settings)) {
    return null;
  }

  const objectType = itemTypeForObject(object);
  return (
    <Action.CopyToClipboard
      title={`Copy ${objectType} JSON`}
      content={getObjectJSON(object)}
      shortcut={getActionShortcut("CopyJSONAction", settings)}
    />
  );
}
