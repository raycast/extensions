import { assign, createMachine } from "xstate";
import { discoverBridgeUsingMdns, discoverBridgeUsingNupnp, getUsernameFromBridge } from "./hue";
import { LocalStorage } from "@raycast/api";
import { v3 } from "node-hue-api";
import { BRIDGE_ID, BRIDGE_IP_ADDRESS_KEY, BRIDGE_USERNAME_KEY } from "./constants";
import HueClient from "./HueClient";

export type HueContext = {
  bridgeIpAddress?: string;
  bridgeId?: string;
  bridgeUsername?: string;
  hueClient?: HueClient;
};

/**
 * @see https://stately.ai/viz/ee0edf94-7a82-4d65-a6a8-324e2f1eca49
 */
export default function hueBridgeMachine(onLinked: () => void) {
  return createMachine<HueContext>({
    id: "manage-hue-bridge",
    initial: "loadingCredentials",
    predictableActionArguments: true,
    context: {
      bridgeIpAddress: undefined,
      bridgeId: undefined,
      bridgeUsername: undefined,
      hueClient: undefined,
    },
    on: {
      UNLINK: {
        target: "unlinking",
      },
    },
    states: {
      loadingCredentials: {
        invoke: {
          id: "loadingCredentials",
          src: async () => {
            const bridgeIpAddress = await LocalStorage.getItem<string>(BRIDGE_IP_ADDRESS_KEY);
            const bridgeId = await LocalStorage.getItem<string>(BRIDGE_ID);
            const bridgeUsername = await LocalStorage.getItem<string>(BRIDGE_USERNAME_KEY);

            if (bridgeIpAddress === undefined || bridgeId === undefined || bridgeUsername === undefined) {
              throw Error("No Hue Bridge credentials found");
            }

            return { bridgeIpAddress, bridgeId, bridgeUsername };
          },
          onDone: {
            actions: assign({
              bridgeIpAddress: (context, event) => event.data.bridgeIpAddress,
              bridgeId: (context, event) => event.data.bridgeId,
              bridgeUsername: (context, event) => event.data.bridgeUsername,
            }),
            target: "connecting",
          },
          onError: {
            target: "discoveringUsingPublicApi",
          },
        },
      },
      connecting: {
        invoke: {
          id: "connecting",
          src: async (context) => {
            // We have already validated that these values are defined, but TypeScript doesn't know that
            if (
              context.bridgeIpAddress === undefined ||
              context.bridgeId === undefined ||
              context.bridgeUsername === undefined
            ) {
              throw Error("Invalid state");
            }

            return new HueClient(context.bridgeIpAddress, context.bridgeId, context.bridgeUsername);
          },
          onDone: {
            actions: assign({ hueClient: (context, event) => event.data }),
            target: "connected",
          },
          onError: {
            target: "failedToConnect",
          },
        },
      },
      connected: {},
      failedToConnect: {
        on: {
          RETRY: {
            target: "connecting",
          },
        },
      },
      discoveringUsingPublicApi: {
        invoke: {
          id: "discoverBridgeUsingNupnp",
          src: discoverBridgeUsingNupnp,
          onDone: {
            actions: assign({ bridgeIpAddress: (context, event) => event.data }),
            target: "linkWithBridge",
          },
          onError: {
            target: "discoveringUsingMdns",
          },
        },
      },
      discoveringUsingMdns: {
        invoke: {
          id: "discoverBridgeUsingMdns",
          src: discoverBridgeUsingMdns,
          onDone: {
            actions: assign({ bridgeIpAddress: (context, event) => event.data }),
            target: "linkWithBridge",
          },
          onError: {
            target: "noBridgeFound",
          },
        },
      },
      noBridgeFound: {
        on: {
          RETRY: {
            target: "discoveringUsingPublicApi",
          },
        },
      },
      linkWithBridge: {
        on: {
          LINK: {
            target: "linking",
          },
        },
      },
      linking: {
        invoke: {
          id: "linking",
          src: async (context) => {
            if (context.bridgeIpAddress === undefined) throw Error("No bridge IP address");
            const username = await getUsernameFromBridge(context.bridgeIpAddress);

            // Get bridge ID using the new credentials
            const api = await v3.api.createLocal(context.bridgeIpAddress).connect(username);
            const configuration = await api.configuration.getConfiguration();

            return { id: configuration.bridgeid, username };
          },
          onDone: {
            target: "linked",
            actions: assign({
              bridgeId: (context, event) => event.data.id,
              bridgeUsername: (context, event) => event.data.username,
              hueClient: (context, event) => {
                if (context.bridgeIpAddress === undefined) throw Error("Invalid state");
                return new HueClient(context.bridgeIpAddress, event.data.id, event.data.username);
              },
            }),
          },
          onError: {
            target: "failedToLink",
          },
        },
      },
      failedToLink: {
        on: {
          RETRY: {
            target: "linking",
          },
        },
      },
      linked: {
        invoke: {
          id: "linked",
          src: async (context) => {
            if (context.bridgeIpAddress === undefined) throw Error("No bridge IP address");
            if (context.bridgeId === undefined) throw Error("No bridge ID");
            if (context.bridgeUsername === undefined) throw Error("No bridge username");
            LocalStorage.setItem(BRIDGE_IP_ADDRESS_KEY, context.bridgeIpAddress).then();
            LocalStorage.setItem(BRIDGE_ID, context.bridgeId).then();
            LocalStorage.setItem(BRIDGE_USERNAME_KEY, context.bridgeUsername).then();
            onLinked();
          },
        },
        on: {
          DONE: {
            target: "connecting",
          },
        },
      },
      unlinking: {
        invoke: {
          id: "unlinking",
          src: async (context) => {
            context.bridgeIpAddress = undefined;
            context.bridgeId = undefined;
            context.bridgeUsername = undefined;
            await LocalStorage.clear();
          },
          onDone: {
            target: "discoveringUsingPublicApi",
          },
        },
      },
    },
  });
}
