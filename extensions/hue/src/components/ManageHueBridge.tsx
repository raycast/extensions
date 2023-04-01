import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, Toast } from "@raycast/api";
import { AnyEventObject, BaseActionObject, ResolveTypegenMeta, ServiceMap, State, TypegenDisabled } from "xstate";
import { HueContext } from "../lib/manageHueBridgeMachine";
import { SendHueMessage } from "../lib/types";
import {
  discoveringMessage,
  failedToConnectMessage,
  failedToLinkMessage,
  linkedMessage,
  linkWithBridgeMessage,
  noBridgeFoundMessage
} from "../lib/markdown";
import ActionStyle = Alert.ActionStyle;
import Style = Toast.Style;

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
  let markdown = "";
  const toast = new Toast({ style: Style.Animated, title: "" });

  switch (hueBridgeState.value) {
    case "connecting":
      return <Detail isLoading />;
      break;
    case "failedToConnect":
      contextActions = [
        <Action key="retryConnect" title="Retry" onAction={() => sendHueMessage("retry")} icon={Icon.Repeat} />,
        <Action title="Unlink Saved Hue Bridge" onAction={unlinkSavedBridge} icon={Icon.Trash} />,
      ];
      markdown = failedToConnectMessage;
      break;
    case "discovering":
      markdown = discoveringMessage;
      toast.title = "Discovering Hue Bridges…";
      toast.show().then();
      break;
    case "noBridgeFound":
      markdown = noBridgeFoundMessage;
      toast.hide().then();
      break;
    case "linkWithBridge":
      contextActions = [
        <Action key="link" title="Link With Hue Bridge" onAction={() => sendHueMessage("link")} icon={Icon.Plug} />,
      ];
      markdown = linkWithBridgeMessage;
      toast.hide().then();
      break;
    case "linking":
      markdown = linkWithBridgeMessage;
      toast.title = `Linking with Hue Bridge…`;
      toast.show().then();
      break;
    case "failedToLink":
      contextActions = [
        <Action key="retryLink" title="Retry" onAction={() => sendHueMessage("retry")} icon={Icon.Repeat} />,
      ];
      markdown = failedToLinkMessage;
      toast.hide().then();
      break;
    case "linked":
      contextActions = [
        <Action key="done" title="Done" onAction={() => sendHueMessage("done")} icon={Icon.Check} />,
        <Action key="unlink" title="Unlink Saved Hue Bridge" onAction={unlinkSavedBridge} icon={Icon.Trash} />,
      ];
      markdown = linkedMessage;
      toast.hide().then();
      break;
  }

  return hueBridgeState.value === "connected"
    ? null
    : <Detail
      key={`${hueBridgeState.value}`}
      markdown={markdown}
      actions={<ActionPanel>{contextActions}</ActionPanel>}
    />;

}
