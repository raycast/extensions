import { Action, Alert, confirmAlert, Icon } from "@raycast/api";
import { SendHueBridgeEvent } from "../lib/hueBridgeMachine";
import ActionStyle = Alert.ActionStyle;

export default function UnlinkAction(props: { send: SendHueBridgeEvent }) {
  return (
    <Action
      title="Unlink Saved Hue Bridge"
      style={Action.Style.Destructive}
      onAction={async () =>
        await confirmAlert({
          title: "Are you sure you want to unlink the configured Hue Bridge?",
          primaryAction: {
            title: "Remove",
            style: ActionStyle.Destructive,
            onAction: () => props.send({ type: "UNLINK" }),
          },
        })
      }
      icon={Icon.Trash}
    />
  );
}
