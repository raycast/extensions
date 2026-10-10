import { Action, ActionPanel, Detail, environment, Icon, Toast } from "@raycast/api";
import { HueBridgeState, SendHueBridgeEvent } from "../lib/hueBridgeMachine";
import { pathToFileURL } from "url";
import Style = Toast.Style;
import React from "react";
import UnlinkAction from "./UnlinkAction";

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

You can remove your saved Hue Bridge by using the ‘Unlink Saved Hue Bridge’ action.
`;

const linkedMessage = `
# Linked with your Hue Bridge

![Success](${successImagePath})

The extension is now linked to your Hue Bridge.

You can remove your saved Hue Bridge by using the ‘Unlink Saved Hue Bridge’ action.
`;

type StateConfig = {
  markdown?: string;
  actions?: (send: SendHueBridgeEvent) => React.JSX.Element[];
  toast?: { title?: string; message?: string; show?: boolean; hide?: boolean };
};

const retry = (send: SendHueBridgeEvent) => (
  <Action key="retry" title="Retry" onAction={() => send({ type: "RETRY" })} icon={Icon.Repeat} />
);

const STATE_CONFIGS: Record<string, StateConfig> = {
  connecting: { toast: { message: "Connecting to Hue Bridge…", show: true } },
  failedToLoadPreferences: { markdown: failedToLoadPreferencesMessage },
  failedToConnect: {
    markdown: failedToConnectMessage,
    actions: (send) => [retry(send), <UnlinkAction key="unlink" send={send} />],
  },
  discoveringUsingMdns: {
    markdown: discoveringMessage,
    toast: { title: "Discovering Hue Bridges…", show: true },
  },
  discoveringUsingPublicApi: { markdown: discoveringMessage },
  noBridgeFound: {
    markdown: noBridgeFoundMessage,
    actions: (send) => [retry(send)],
    toast: { hide: true },
  },
  waitingForLinkButton: {
    markdown: linkWithBridgeMessage,
    actions: (send) => [
      <Action key="link" title="Link with Hue Bridge" onAction={() => send({ type: "LINK" })} icon={Icon.Plug} />,
    ],
    toast: { hide: true },
  },
  linking: {
    markdown: linkWithBridgeMessage,
    toast: { title: "Linking with Hue Bridge…", show: true },
  },
  failedToLink: {
    markdown: failedToLinkMessage,
    actions: (send) => [retry(send)],
  },
  linked: {
    markdown: linkedMessage,
    actions: (send) => [
      <Action key="done" title="Done" onAction={() => send({ type: "DONE" })} icon={Icon.Check} />,
      <UnlinkAction key="unlink" send={send} />,
    ],
    toast: { hide: true },
  },
};

/** Returns a Detail view for machine states that need user interaction, otherwise null. */
export default function ManageHueBridge(
  hueBridgeState: HueBridgeState,
  send: SendHueBridgeEvent,
): React.JSX.Element | null {
  const config = STATE_CONFIGS[hueBridgeState.value as keyof typeof STATE_CONFIGS];
  if (config?.toast) {
    const toast = new Toast({ style: Style.Animated, title: config.toast.title ?? "", message: config.toast.message });
    if (config.toast.show) toast.show().then();
    if (config.toast.hide) toast.hide().then();
  }
  if (!config?.markdown) return null;

  return (
    <Detail
      key={`${hueBridgeState.value}`}
      markdown={config.markdown}
      actions={<ActionPanel>{config.actions?.(send)}</ActionPanel>}
    />
  );
}
