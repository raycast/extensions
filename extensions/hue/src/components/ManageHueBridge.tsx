import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, Toast } from "@raycast/api";
import { HueBridgeState } from "../lib/hueBridgeMachine";
import {
  discoveringMessage,
  failedToConnectMessage,
  failedToLinkMessage,
  linkedMessage,
  linkWithBridgeMessage,
  noBridgeFoundMessage,
} from "../lib/markdown";
import { SendHueMessage } from "../lib/useHue";
import ActionStyle = Alert.ActionStyle;
import Style = Toast.Style;

/**
 * ManageHueBridge is a component that renders a view based on the current state of the Hue Bridge machine.
 *
 * When the machine is in a state that requires user interaction, it will render a Detail view,
 * otherwise it will return null.
 */
export default function ManageHueBridge(
  hueBridgeState: HueBridgeState,
  sendHueMessage: SendHueMessage
): JSX.Element | null {
  const unlinkSavedBridge = async () => {
    await confirmAlert({
      title: "Are you sure you want to unlink the configured Hue Bridge?",
      primaryAction: { title: "Remove", style: ActionStyle.Destructive, onAction: () => sendHueMessage("UNLINK") },
    });
  };

  let contextActions: JSX.Element[] = [];
  let markdown = "";
  const toast = new Toast({ style: Style.Animated, title: "" });

  switch (hueBridgeState.value) {
    case "loadingCredentials":
    case "discoveringUsingPublicApi":
    case "connected":
      return null;
    case "connecting":
      toast.message = "Connecting to Hue Bridge…";
      toast.show().then();
      return null;
    case "failedToConnect":
      toast.hide().then();
      contextActions = [
        <Action key="retryConnect" title="Retry" onAction={() => sendHueMessage("RETRY")} icon={Icon.Repeat} />,
        <Action key="unlink" title="Unlink Saved Hue Bridge" onAction={unlinkSavedBridge} icon={Icon.Trash} />,
      ];
      markdown = failedToConnectMessage;
      break;
    case "discoveringUsingMdns":
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
        <Action key="link" title="Link With Hue Bridge" onAction={() => sendHueMessage("LINK")} icon={Icon.Plug} />,
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
        <Action key="retryLink" title="Retry" onAction={() => sendHueMessage("RETRY")} icon={Icon.Repeat} />,
      ];
      markdown = failedToLinkMessage;
      toast.hide().then();
      break;
    case "linked":
      contextActions = [
        <Action key="done" title="Done" onAction={() => sendHueMessage("DONE")} icon={Icon.Check} />,
        <Action key="unlink" title="Unlink Saved Hue Bridge" onAction={unlinkSavedBridge} icon={Icon.Trash} />,
      ];
      markdown = linkedMessage;
      toast.hide().then();
      break;
  }

  return hueBridgeState.value === "connected" ? null : (
    <Detail key={`${hueBridgeState.value}`} markdown={markdown} actions={<ActionPanel>{contextActions}</ActionPanel>} />
  );
}
