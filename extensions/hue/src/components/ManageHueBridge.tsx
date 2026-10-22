import { Action, ActionPanel, Detail, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import { HueBridgeState, SendHueBridgeEvent } from "../lib/hueBridgeMachine";
import React from "react";
import UnlinkAction from "./UnlinkAction";

const discoveringMessage = `
# Connecting to Hue Bridge

![Not Found](bridge-connect.png)

Please wait while discovering a Hue Bridge.
`;

const noBridgeFoundMessage = `
# No Hue Bridge found

![Not Found](bridge-connect.png)

Your Hue Bridge must be switched on, plugged into your router via an Ethernet cable and connected to the same Wi-Fi network as your device. All three blue lights on the Hue Bridge should be on.

You can manually enter the IP address of your Hue Bridge in this extension’s preferences.
`;

const linkWithBridgeMessage = `
# Connecting to Hue Bridge

![Press Button](bridge-button.png)

Press the link button in the center of the bridge.
`;

const failedToLoadPreferencesMessage = `
# Failed to load preferences

![Failure](bridge-failure.png)

Please make sure you have entered a valid Hue Bridge IP address.

If your saved Hue Bridge can’t be read, you can remove it by using the ‘Unlink Saved Hue Bridge’ action.
`;

const ipAddressNote = (ipAddress?: string) =>
  ipAddress
    ? `
This extension’s Bridge IP address preference is set to ${ipAddress}. If that isn’t your Hue Bridge’s address, correct it, or clear it to find the bridge automatically.
`
    : "";

const failedToLinkMessage = ({ bridgeIpAddress }: Preferences) => `
# Failed to link with the Hue Bridge

![Failure](bridge-failure.png)

Use the ‘Retry’ action and press the link button in the center of the bridge.
${ipAddressNote(bridgeIpAddress)}`;

const failedToConnectMessage = ({ bridgeIpAddress }: Preferences) => `
# Could not find the saved Hue Bridge

![Failure](bridge-failure.png)

Please check your network connection and make sure you are connected to the same network as your Hue Bridge.
${ipAddressNote(bridgeIpAddress)}
You can remove your saved Hue Bridge by using the ‘Unlink Saved Hue Bridge’ action.
`;

const unauthorizedMessage = `
# Link with your Hue Bridge again

![Failure](bridge-failure.png)

Your Hue Bridge no longer accepts this extension, for example because it was removed in the Hue app or the bridge was reset.

Link again to keep using your saved Hue Bridge.
`;

const rejectedUsernameMessage = `
# Check the Bridge Username preference

![Failure](bridge-failure.png)

Your Hue Bridge doesn’t accept the username set in this extension’s Bridge Username preference.

Correct it, or clear it to find the bridge automatically.
`;

const linkedMessage = `
# Linked with your Hue Bridge

![Success](bridge-success.png)

The extension is now linked to your Hue Bridge.

You can remove your saved Hue Bridge by using the ‘Unlink Saved Hue Bridge’ action.
`;

type View = {
  markdown: string | ((preferences: Preferences) => string);
  actions?: (send: SendHueBridgeEvent, preferences: Preferences) => React.JSX.Element[];
};

// A nested state's value is an object keyed by its parent's name.
type StateName = HueBridgeState["value"] extends infer V ? (V extends string ? V : keyof V) : never;

const retry = (send: SendHueBridgeEvent) => (
  <Action key="retry" title="Retry" onAction={() => send({ type: "RETRY" })} icon={Icon.Repeat} />
);

const openPreferences = (
  <Action key="preferences" title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
);

const VIEWS: Record<StateName, View | null> = {
  loadingPreferences: null,
  failedToLoadPreferences: {
    markdown: failedToLoadPreferencesMessage,
    actions: (send) => [openPreferences, <UnlinkAction key="unlink" send={send} />],
  },
  loadingConfiguration: null,
  connecting: null,
  connected: null,
  // Linking again would check the username preference again.
  unauthorized: {
    markdown: ({ bridgeUsername }) => (bridgeUsername ? rejectedUsernameMessage : unauthorizedMessage),
    actions: (send, { bridgeUsername }) => [
      bridgeUsername ? (
        openPreferences
      ) : (
        <Action key="link" title="Link Again" onAction={() => send({ type: "LINK" })} icon={Icon.Plug} />
      ),
      <UnlinkAction key="unlink" send={send} />,
    ],
  },
  failedToConnect: {
    markdown: failedToConnectMessage,
    actions: (send) => [retry(send), openPreferences, <UnlinkAction key="unlink" send={send} />],
  },
  discovering: { markdown: discoveringMessage },
  noBridgeFound: {
    markdown: noBridgeFoundMessage,
    actions: (send) => [retry(send), openPreferences],
  },
  waitingForLinkButton: { markdown: linkWithBridgeMessage },
  failedToLink: {
    markdown: failedToLinkMessage,
    actions: (send) => [retry(send), openPreferences],
  },
  linked: {
    markdown: linkedMessage,
    actions: (send) => [
      <Action key="done" title="Done" onAction={() => send({ type: "DONE" })} icon={Icon.Check} />,
      <UnlinkAction key="unlink" send={send} />,
    ],
  },
  unlinking: null,
};

/** Returns a Detail view for machine states that need user interaction, otherwise null. */
export default function ManageHueBridge(
  hueBridgeState: HueBridgeState,
  send: SendHueBridgeEvent,
): React.JSX.Element | null {
  const { value } = hueBridgeState;
  const name = (typeof value === "string" ? value : Object.keys(value)[0]) as StateName;
  const view = VIEWS[name];
  if (view === null) return null;

  const preferences = getPreferenceValues<Preferences>();
  const markdown = typeof view.markdown === "string" ? view.markdown : view.markdown(preferences);
  return (
    <Detail key={name} markdown={markdown} actions={<ActionPanel>{view.actions?.(send, preferences)}</ActionPanel>} />
  );
}
