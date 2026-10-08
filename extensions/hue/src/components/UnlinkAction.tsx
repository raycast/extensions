import { Action, Alert, confirmAlert, Icon } from "@raycast/api";
import { SendHueMessage } from "../hooks/useHue";
import ActionStyle = Alert.ActionStyle;

export default function UnlinkAction(props: { sendHueMessage: SendHueMessage }) {
  return (
    <Action
      key="unlink"
      title="Unlink Saved Hue Bridge"
      style={Action.Style.Destructive}
      onAction={async () =>
        await confirmAlert({
          title: "Are you sure you want to unlink the configured Hue Bridge?",
          primaryAction: {
            title: "Remove",
            style: ActionStyle.Destructive,
            onAction: () => props.sendHueMessage("UNLINK"),
          },
        })
      }
      icon={Icon.Trash}
    />
  );
}
