import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon } from "@raycast/api";
import { AnyEventObject, BaseActionObject, ResolveTypegenMeta, ServiceMap, State, TypegenDisabled } from "xstate";
import { HueContext } from "../lib/manageHueBridgeMachine";
import { SendHueMessage } from "../lib/hue";
import ActionStyle = Alert.ActionStyle;

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ManageHueBridge(
  hueBridgeState: State<
    HueContext,
    AnyEventObject,
    any,
    { value: any; context: HueContext },
    ResolveTypegenMeta<TypegenDisabled, AnyEventObject, BaseActionObject, ServiceMap>
  >,
  sendHueMessage: SendHueMessage
): JSX.Element | null {
  const unlinkSavedBridge = async () => {
    await confirmAlert({
      title: "Are you sure you want to unlink the configured Hue Bridge?",
      primaryAction: { title: "Remove", style: ActionStyle.Destructive, onAction: () => sendHueMessage("unlink") },
    });
  };

  let contextActions: JSX.Element[] = [];
  switch (hueBridgeState.value) {
    case "linkWithBridge":
      contextActions = [
        <Action key="link" title="Link With Bridge" onAction={() => sendHueMessage("link")} icon={Icon.Plug} />,
      ];
      break;
    case "noBridgeFound":
    case "failedToLink":
      contextActions = [
        <Action key="retryLink" title="Retry" onAction={() => sendHueMessage("retry")} icon={Icon.Repeat} />,
      ];
      break;
    case "failedToConnect":
      contextActions = [
        <Action key="retryConnect" title="Retry" onAction={() => sendHueMessage("retry")} icon={Icon.Repeat} />,
        <Action title="Unlink Saved Hue Bridge" onAction={unlinkSavedBridge} icon={Icon.Trash} />,
      ];
      break;
    case "linked":
      contextActions = [
        <Action key="done" title="Done" onAction={() => sendHueMessage("done")} icon={Icon.Check} />,
        <Action key="unlink" title="Unlink Saved Hue Bridge" onAction={unlinkSavedBridge} icon={Icon.Trash} />,
      ];
  }

  return hueBridgeState.context.shouldDisplay ? (
    <Detail
      key={`${hueBridgeState.value}`}
      isLoading={!hueBridgeState.context.shouldDisplay}
      markdown={hueBridgeState.context.shouldDisplay ? hueBridgeState.context.markdown : null}
      actions={<ActionPanel>{contextActions}</ActionPanel>}
    />
  ) : null;
}
