import { Action, ActionPanel, Alert, confirmAlert, Detail, environment, Icon, Toast } from "@raycast/api";
import { HueBridgeState } from "../lib/hueBridgeMachine";
import { SendHueMessage } from "../hooks/useHue";
import { pathToFileURL } from "url";
import ActionStyle = Alert.ActionStyle;
import Style = Toast.Style;
import React from "react";

const successImagePath = pathToFileURL(`${environment.assetsPath}/bridge-success.png`).href;
const failureImagePath = pathToFileURL(`${environment.assetsPath}/bridge-failure.png`).href;
const connectImagePath = pathToFileURL(`${environment.assetsPath}/bridge-connect.png`).href;
const buttonImagePath = pathToFileURL(`${environment.assetsPath}/bridge-button.png`).href;

const discoveringMessage = `
# Connecting to Hue Bridge

![Not Found](${connectImagePath})

Please wait while discovering a Hue Bridge.
`;

const noBridgeFoundMessage = `
# No Hue Bridge found

![Not Found](${connectImagePath})

Your Hue Bridge must be switched on, plugged into your router via an Ethernet cable and connected to the same Wi-Fi network as your device. All three blue lights on the Hue Bridge should be on.

You can manually enter the IP address of your Hue Bridge in this extension’s preferences.
`;

const linkWithBridgeMessage = `
# Connecting to Hue Bridge

![Press Button](${buttonImagePath})

Press the link button in the center of the bridge and press enter.
`;

const failedToLoadPreferencesMessage = `
# Failed to load preferences

![Failure](${failureImagePath})

Please make sure you have entered a valid Hue Bridge IP address.
`;

const failedToLinkMessage = `
# Failed to link with the Hue Bridge

![Failure](${failureImagePath})

Press the button in the center and use the ‘Retry’ action to connect.
`;

const failedToConnectMessage = `
# Could not find the saved Hue Bridge

![Failure](${failureImagePath})

Please check your network connection and make sure you are connected to the same network as your Hue Bridge.

You can remove your saved Hue Bridge by using the ‘Unlink Hue Bridge’ action.
`;

const linkedMessage = `
# Linked with your Hue Bridge

![Success](${successImagePath})

The extension is now linked to your Hue Bridge.

You can remove your saved Hue Bridge by using the ‘Unlink Hue Bridge’ action.
`;

/**
 * ManageHueBridge is a component that renders a view based on the current state of the Hue Bridge machine.
 *
 * When the machine is in a state that requires user interaction, it will render a Detail view,
 * otherwise it will return null.
 */
type StateConfig = {
  markdown?: string;
  actions?: (sendHueMessage: SendHueMessage, unlinkSavedBridge: () => Promise<void>) => React.JSX.Element[];
  toast?: { title?: string; message?: string; show?: boolean; hide?: boolean };
  returnNull?: boolean;
};

const STATE_CONFIGS: Record<string, StateConfig> = {
  loadingPreferences: { returnNull: true },
  loadingCredentials: { returnNull: true },
  discoveringUsingPublicApi: { returnNull: true },
  connected: { returnNull: true },
  connecting: { returnNull: true, toast: { message: "Connecting to Hue Bridge…", show: true } },
  failedToLoadPreferences: { markdown: failedToLoadPreferencesMessage },
  failedToConnect: {
    markdown: failedToConnectMessage,
    actions: (sendHueMessage, unlinkSavedBridge) => [
      <Action key="retryConnect" title="Retry" onAction={() => sendHueMessage("RETRY")} icon={Icon.Repeat} />,
      <Action
        key="unlink"
        title="Unlink Saved Hue Bridge"
        onAction={unlinkSavedBridge}
        style={Action.Style.Destructive}
        icon={Icon.Trash}
      />,
    ],
  },
  discoveringUsingMdns: {
    markdown: discoveringMessage,
    toast: { title: "Discovering Hue Bridges…", show: true },
  },
  noBridgeFound: {
    markdown: noBridgeFoundMessage,
    actions: (sendHueMessage) => [
      <Action key="retryLink" title="Retry" onAction={() => sendHueMessage("RETRY")} icon={Icon.Repeat} />,
    ],
    toast: { hide: true },
  },
  linkWithBridge: {
    markdown: linkWithBridgeMessage,
    actions: (sendHueMessage) => [
      <Action key="link" title="Link with Hue Bridge" onAction={() => sendHueMessage("LINK")} icon={Icon.Plug} />,
    ],
    toast: { hide: true },
  },
  linking: {
    markdown: linkWithBridgeMessage,
    toast: { title: "Linking with Hue Bridge…", show: true },
  },
  failedToLink: {
    markdown: failedToLinkMessage,
    actions: (sendHueMessage) => [
      <Action key="retryLink" title="Retry" onAction={() => sendHueMessage("RETRY")} icon={Icon.Repeat} />,
    ],
  },
  linked: {
    markdown: linkedMessage,
    actions: (sendHueMessage, unlinkSavedBridge) => [
      <Action key="done" title="Done" onAction={() => sendHueMessage("DONE")} icon={Icon.Check} />,
      <Action
        key="unlink"
        title="Unlink Saved Hue Bridge"
        onAction={unlinkSavedBridge}
        style={Action.Style.Destructive}
        icon={Icon.Trash}
      />,
    ],
    toast: { hide: true },
  },
};

export default function ManageHueBridge(
  hueBridgeState: HueBridgeState,
  sendHueMessage: SendHueMessage,
): React.JSX.Element | null {
  const unlinkSavedBridge = async () => {
    await confirmAlert({
      title: "Are you sure you want to unlink the configured Hue Bridge?",
      primaryAction: { title: "Remove", style: ActionStyle.Destructive, onAction: () => sendHueMessage("UNLINK") },
    });
  };

  const config = STATE_CONFIGS[hueBridgeState.value as keyof typeof STATE_CONFIGS];
  if (!config || config.returnNull) {
    if (config?.toast) {
      const toast = new Toast({
        style: Style.Animated,
        title: config.toast.title || "",
        message: config.toast.message,
      });
      if (config.toast.show) toast.show().then();
    }
    return null;
  }

  const toast = new Toast({ style: Style.Animated, title: "" });
  if (config.toast) {
    if (config.toast.title) toast.title = config.toast.title;
    if (config.toast.message) toast.message = config.toast.message;
    if (config.toast.show) toast.show().then();
    if (config.toast.hide) toast.hide().then();
  }

  const contextActions = config.actions ? config.actions(sendHueMessage, unlinkSavedBridge) : [];
  const markdown = config.markdown || "";

  return (
    <Detail key={`${hueBridgeState.value}`} markdown={markdown} actions={<ActionPanel>{contextActions}</ActionPanel>} />
  );
}
