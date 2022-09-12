import { environment } from "@raycast/api";
import { pathToFileURL } from "url";

const successImagePath = pathToFileURL(`${environment.assetsPath}/bridge-success.png`).href;
const failureImagePath = pathToFileURL(`${environment.assetsPath}/bridge-failure.png`).href;
const connectImagePath = pathToFileURL(`${environment.assetsPath}/bridge-connect.png`).href;
const buttonImagePath = pathToFileURL(`${environment.assetsPath}/bridge-button.png`).href;

export const noBridgeConfiguredMessage = `
# No Hue Bridge Configured

![Not Found](${connectImagePath})

Please use the ‘Manage Hue Bridge’ command to link your Hue Bridge.
`;

export const discoveringMessage = `
# Connecting to Hue Bridge

![Not Found](${connectImagePath})

Please wait while discovering a Hue Bridge.
`;

export const bridgeNotFoundMessage = `
# Could not find the Hue Bridge

![Failure](${failureImagePath})

Please check your network connection and make sure you are connected to the same network as your Hue Bridge.

You can remove your saved Hue Bridge from the ‘Manage Hue Bridge’ command.
`;

export const noBridgeFoundMessage = `
# No Hue Bridge found

![Not Found](${connectImagePath})

Your Hue Bridge must be switched on, plugged into your router via an Ethernet cable and connected to the same Wi-Fi network as your device. All three blue lights on the Hue Bridge should be on.
`;

export const linkWithBridgeMessage = `
# Connecting to Hue Bridge

![Press Button](${buttonImagePath})

Press the link button in the center of the bridge and press enter.
`;

export const failedToLinkMessage = `
# Failed to link with the Hue Bridge

![Failure](${failureImagePath})

Press the button in the center and use the ‘Retry’ action to connect.
`;

export const failedToConnectMessage = `
# Could not find the saved Hue Bridge

![Failure](${failureImagePath})

Please check your network connection and make sure you are connected to the same network as your Hue Bridge.

You can remove your saved Hue Bridge by using the ‘Remove Saved Hue Bridge’ action.
`;

export const linkedMessage = `
# Linked with your Hue Bridge

![Success](${successImagePath})

The extension is now linked to your Hue Bridge.

You can remove your saved Hue Bridge by using the ‘Remove Saved Hue Bridge’ action.
`;
