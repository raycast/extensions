/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { LocalStorage, Toast } from "@raycast/api";
import { v3 } from "node-hue-api";
import { BRIDGE_CONFIG_KEY } from "./constants";
import HueClient from "./HueClient";
import { BridgeConfig, GroupedLight, Light, Room, Scene, Zone } from "./types";
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
  bridgeConfig?: BridgeConfig;
  bridgeId?: string;
  bridgeUsername?: string;
  hueClient?: HueClient;
};

/**
 * @see https://stately.ai/viz/ee0edf94-7a82-4d65-a6a8-324e2f1eca49
 */
export default function hueBridgeMachine(
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
      bridgeConfig: undefined,
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
            const bridgeConfigString = await LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY);

            if (bridgeConfigString === undefined) {
              throw new Error("No bridge configuration found");
            }

            return { bridgeConfig: JSON.parse(bridgeConfigString) };
          },
          onDone: {
            actions: assign({
              bridgeConfig: (context, event) => event.data.bridgeConfig,
            }),
            target: "connecting",
          },
          onError: {
            actions: (_, event) => {
              // This is expected if the user has not yet linked their bridge. Hence, info instead of error.
              console.info(event.data.message);
            },
            target: "discoveringUsingPublicApi",
          },
        },
      },
      connecting: {
        invoke: {
          id: "connecting",
          src: async (context) => {
            // We have already validated that these values are defined, but TypeScript doesn't know that
            if (context.bridgeConfig === undefined) {
              throw Error("Invalid state");
            }

            const hueClient = await HueClient.createInstance(
              context.bridgeConfig,
              setLights,
              setGroupedLights,
              setRooms,
              setZones,
              setScenes
            );

            new Toast({ title: "" }).hide().then();

            return hueClient;
          },
          onDone: {
            actions: assign({ hueClient: (context, event) => event.data }),
            target: "connected",
          },
          onError: {
            actions: (_, event) => console.error(event.data),
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
            actions: (_, event) => console.error(event.data),
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
            actions: (_, event) => console.error(event.data),
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

            // TODO: Get Bridge certificate and determine if it is self-signed

            const username = await getUsernameFromBridge(context.bridgeIpAddress);

            // Get bridge ID using the new credentials
            const api = await v3.api.createLocal(context.bridgeIpAddress).connect(username);
            const configuration = await api.configuration.getConfiguration();

            const bridgeConfig: BridgeConfig = {
              ipAddress: context.bridgeIpAddress,
              username,
              id: configuration.bridgeid,
            };

            const hueClient = await HueClient.createInstance(
              bridgeConfig,
              setLights,
              setGroupedLights,
              setRooms,
              setZones,
              setScenes
            );

            return { bridgeConfig, hueClient };
          },
          onDone: {
            target: "linked",
            actions: assign({
              bridgeConfig: (context, event) => event.data.bridgeConfig,
              hueClient: (context, event) => event.data.hueClient,
            }),
          },
          onError: {
            actions: (_, event) => console.error(event.data),
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
            if (context.bridgeConfig === undefined) throw Error("No bridge IP address");
            await LocalStorage.setItem(BRIDGE_CONFIG_KEY, JSON.stringify(context.bridgeConfig));
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
