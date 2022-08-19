import { assign, createMachine } from "xstate";
import { discoverBridge, linkWithBridge } from "./hue";
import { LocalStorage, Toast } from "@raycast/api";
import {
  connectedMessage,
  failedToConnectMessage,
  failedToLinkMessage,
  linkWithBridgeMessage,
  noBridgeFoundMessage,
} from "./markdown";
import { v3 } from "node-hue-api";
import { BRIDGE_IP_ADDRESS_KEY, BRIDGE_USERNAME_KEY } from "./constants";
import Style = Toast.Style;

export interface HueContext {
  bridgeIpAddress?: string;
  bridgeUsername?: string;
  shouldDisplay: boolean;
  markdown?: string;
  actions: Element[];
  toast: Toast;
}

/**
 * @see https://stately.ai/viz/ee0edf94-7a82-4d65-a6a8-324e2f1eca49
 */
export const manageHueBridgeMachine = createMachine<HueContext>(
  {
    id: "manage-hue-bridge",
    initial: "loadCredentials",
    context: {
      bridgeIpAddress: undefined,
      bridgeUsername: undefined,
      shouldDisplay: false,
      markdown: undefined,
      actions: [],
      toast: new Toast({ style: Style.Animated, title: "" }),
    },
    states: {
      loadCredentials: {
        invoke: {
          id: "loadCredentials",
          src: async () => {
            const bridgeIpAddress = await LocalStorage.getItem<string>(BRIDGE_IP_ADDRESS_KEY);
            const bridgeUsername = await LocalStorage.getItem<string>(BRIDGE_USERNAME_KEY);
            if (bridgeIpAddress === undefined) throw Error("No bridge IP address stored");
            if (bridgeUsername === undefined) throw Error("No bridge IP username stored");
            return { bridgeIpAddress, bridgeUsername };
          },
          onDone: {
            target: "connecting",
            actions: [
              assign({ bridgeIpAddress: (context, event) => event.data.bridgeIpAddress }),
              assign({ bridgeUsername: (context, event) => event.data.bridgeUsername }),
            ],
          },
          onError: {
            target: "discovering",
          },
        },
      },
      discovering: {
        entry: "showDiscovering",
        exit: "hideToast",
        invoke: {
          id: "discoverBridge",
          src: discoverBridge,
          onDone: {
            // TODO: Handle finding multiple bridges by offering the user to select one
            actions: assign({ bridgeIpAddress: (context, event) => event.data }),
            target: "linkWithBridge",
          },
          onError: {
            target: "noBridgeFound",
          },
        },
      },
      noBridgeFound: {
        entry: "showNoBridgeFound",
        on: {
          RETRY: {
            target: "discovering",
          },
        },
      },
      linkWithBridge: {
        entry: "showLinkWithBridge",
        on: {
          LINK: {
            target: "linking",
          },
        },
      },
      linking: {
        entry: "showLinking",
        invoke: {
          id: "linking",
          src: async (context) => {
            if (context.bridgeIpAddress === undefined) throw Error("No bridge IP address");
            return await linkWithBridge(context.bridgeIpAddress);
          },
          onDone: {
            target: "connecting",
            actions: assign({ bridgeUsername: (context, event) => event.data }),
          },
          onError: {
            target: "failedToLink",
          },
        },
      },
      failedToLink: {
        entry: "showFailedToLink",
        on: {
          RETRY: {
            target: "linking",
          },
        },
      },
      connecting: {
        entry: "showConnecting",
        exit: "hideToast",
        invoke: {
          id: "connectToBridge",
          src: async (context) => {
            if (context.bridgeIpAddress === undefined) throw Error("No bridge IP address");
            if (context.bridgeUsername === undefined) throw Error("No bridge username");
            await v3.api.createLocal(context.bridgeIpAddress).connect(context.bridgeUsername);
          },
          onDone: {
            target: "connected",
          },
          onError: {
            target: "failedToConnect",
          },
        },
      },
      failedToConnect: {
        entry: "showFailedToConnect",
        on: {
          RETRY: {
            target: "connecting",
          },
        },
      },
      connected: {
        entry: "showConnected",
        invoke: {
          id: "saveCredentials",
          src: async (context) => {
            if (context.bridgeIpAddress === undefined) throw Error("No bridge IP address");
            if (context.bridgeUsername === undefined) throw Error("No bridge username");
            LocalStorage.setItem(BRIDGE_IP_ADDRESS_KEY, context.bridgeIpAddress).then();
            LocalStorage.setItem(BRIDGE_USERNAME_KEY, context.bridgeUsername).then();
          },
        },
        on: {
          UNLINK: {
            target: "unlinking",
          },
        },
      },
      unlinking: {
        invoke: {
          id: "unlinking",
          src: async (context) => {
            context.bridgeIpAddress = undefined;
            context.bridgeUsername = undefined;
            await LocalStorage.removeItem(BRIDGE_IP_ADDRESS_KEY);
            await LocalStorage.removeItem(BRIDGE_USERNAME_KEY);
          },
          onDone: {
            target: "discovering",
          },
        },
      },
    },
  },
  {
    actions: {
      showDiscovering: async (context) => {
        context.toast.style = Style.Animated;
        context.toast.title = "Discovering…";
        context.toast.show().then();
      },
      showLinking: async (context) => {
        context.toast.style = Style.Animated;
        context.toast.title = "Linking…";
        context.toast.show().then();
      },
      showConnecting: async (context) => {
        context.toast.style = Style.Animated;
        context.toast.title = "Connecting…";
        context.toast.show().then();
      },
      showLinkWithBridge: (context) => {
        context.toast.style = Style.Success;
        context.toast.title = "Hue Bridge found";
        context.toast.show().then();
        context.shouldDisplay = true;
        context.markdown = linkWithBridgeMessage;
      },
      showNoBridgeFound: (context) => {
        context.toast.style = Style.Failure;
        context.toast.title = "No Hue Bridge found";
        context.toast.show().then();
        context.shouldDisplay = true;
        context.markdown = noBridgeFoundMessage;
      },
      showFailedToConnect: (context) => {
        context.toast.style = Style.Failure;
        context.toast.title = "Failed to connect";
        context.toast.show().then();
        context.shouldDisplay = true;
        context.markdown = failedToConnectMessage;
      },
      showFailedToLink: (context) => {
        context.toast.style = Style.Failure;
        context.toast.title = "Failed to link";
        context.toast.show().then();
        context.shouldDisplay = true;
        context.markdown = failedToLinkMessage;
      },
      showConnected: (context) => {
        context.toast.style = Style.Success;
        context.toast.title = "Connected";
        context.toast.show().then();
        context.shouldDisplay = true;
        context.markdown = connectedMessage;
      },
      hideToast: async (context) => {
        context.toast.hide().then();
      },
    },
  }
);
