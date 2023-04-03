import {
  AnyEventObject,
  assign,
  BaseActionObject,
  createMachine,
  ResolveTypegenMeta,
  ServiceMap,
  State,
  TypegenDisabled,
} from "xstate";
import { discoverBridgeUsingMdns, discoverBridgeUsingNupnp, getUsernameFromBridge } from "./utils";
import { LocalStorage } from "@raycast/api";
import { v3 } from "node-hue-api";
import { BRIDGE_ID, BRIDGE_IP_ADDRESS_KEY, BRIDGE_USERNAME_KEY } from "./constants";
import HueClient from "./HueClient";
import { useDeepMemo } from "@raycast/utils/dist/useDeepMemo";
import { useMachine } from "@xstate/react";
import { HueMessage, SendHueMessage } from "./useHue";
import { GroupedLight, Light, Room, Scene, Zone } from "./types";
import React from "react";

export type HueBridgeState = State<
  HueContext,
  AnyEventObject,
  any,
  { value: any; context: HueContext },
  ResolveTypegenMeta<TypegenDisabled, AnyEventObject, BaseActionObject, ServiceMap>
>;

export type HueContext = {
  bridgeIpAddress?: string;
  bridgeId?: string;
  bridgeUsername?: string;
  hueClient?: HueClient;
};

export function useHueBridgeMachine(
  setLights: React.Dispatch<React.SetStateAction<Light[]>>,
  setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>,
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>,
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>
) {
  const machine = useDeepMemo(() => hueBridgeMachine(setLights, setGroupedLights, setRooms, setZones, setScenes));

  const [hueBridgeState, send] = useMachine(machine);
  const sendHueMessage: SendHueMessage = (message: HueMessage) => {
    send(message.toUpperCase());
  };

  return {
    hueBridgeState,
    sendHueMessage,
  };
}

/**
 * @see https://stately.ai/viz/ee0edf94-7a82-4d65-a6a8-324e2f1eca49
 */
function hueBridgeMachine(
  setLights: React.Dispatch<React.SetStateAction<Light[]>>,
  setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>,
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>,
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>
) {
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

            return await HueClient.createInstance(
              context.bridgeIpAddress,
              context.bridgeId,
              context.bridgeUsername,
              setLights,
              setGroupedLights,
              setRooms,
              setZones,
              setScenes
            );
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
            const hueClient = await HueClient.createInstance(
              context.bridgeIpAddress,
              configuration.bridgeid,
              username,
              setLights,
              setGroupedLights,
              setRooms,
              setZones,
              setScenes
            );

            return { bridgeId: configuration.bridgeid, bridgeUsername: username, hueClient };
          },
          onDone: {
            target: "linked",
            actions: assign({
              bridgeId: (context, event) => event.data.bridgeId,
              bridgeUsername: (context, event) => event.data.bridgeUsername,
              hueClient: (context, event) => event.data.hueClient,
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
