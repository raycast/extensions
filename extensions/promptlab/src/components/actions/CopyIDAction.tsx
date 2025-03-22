import { Action } from "@raycast/api";
import { getActionShortcut, isActionEnabled } from "../../lib/actions";
import { AdvancedSettings } from "../../data/default-advanced-settings";
import { IdentifiableObject } from "../../lib/common/types";
import { itemTypeForObject } from "../../lib/common/object-utils";

type CopyIDActionProps = {
  object: IdentifiableObject;
  settings: AdvancedSettings;
};

export default function CopyIDAction(props: CopyIDActionProps) {
  const { object, settings } = props;
  if (!isActionEnabled("CopyIDAction", settings)) {
    return null;
  }

  const objectType = itemTypeForObject(object);
  return (
    <Action.CopyToClipboard
      title={`Copy ${objectType} ID`}
      content={object.id}
      shortcut={getActionShortcut("CopyIDAction", settings)}
    />
  );
}
