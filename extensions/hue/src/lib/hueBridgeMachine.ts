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
import { getPreferenceValues, LocalStorage, Toast } from "@raycast/api";
import { BRIDGE_CONFIG_KEY } from "../helpers/constants";
import HueClient from "./HueClient";
import { BridgeConfig, GroupedLight, Light, Room, Scene, Zone } from "./types";
import React from "react";
import createHueClient from "./createHueClient";
import { discoverBridgeUsingMdns, discoverBridgeUsingNupnp } from "../helpers/hueNetworking";
import { linkWithBridge } from "./linkWithBridge";

export type HueBridgeState = State<
  HueContext,
  AnyEventObject,
  any,
  { value: any; context: HueContext },
  ResolveTypegenMeta<TypegenDisabled, AnyEventObject, BaseActionObject, ServiceMap>
>;

export type HueContext = {
  bridgeIpAddress?: string;
  bridgeUsername?: string;
  bridgeId?: string;
  bridgeConfig?: BridgeConfig;
  hueClient?: HueClient;
};

/**
 * @see https://stately.ai/viz/5dacdcc5-0f75-4620-9330-3455876b2e50
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
    initial: "loadingPreferences",
    predictableActionArguments: true,
    context: {
      bridgeIpAddress: undefined,
      bridgeUsername: undefined,
      bridgeId: undefined,
      bridgeConfig: undefined,
      hueClient: undefined,
    },
    on: {
      UNLINK: {
        target: "unlinking",
      },
    },
    states: {
      loadingPreferences: {
        invoke: {
          id: "loadingPreferences",
          src: async () => {
            const preferences = getPreferenceValues();
            const bridgeIpAddress = preferences.bridgeIpAddress;
            const bridgeUsername = preferences.bridgeUsername;

            if (bridgeIpAddress && bridgeUsername) {
              console.log("Using bridge IP address and username from preferences");
            } else if (bridgeIpAddress) {
              console.log("Using bridge IP address from preferences");
            } else if (bridgeUsername) {
              console.log("Using bridge username from preferences");
            }

            return {
              bridgeIpAddress: bridgeIpAddress,
              bridgeUsername: bridgeUsername,
            };
          },
          onDone: {
            actions: assign({
              bridgeIpAddress: (context, event) => event.data.bridgeIpAddress,
              bridgeUsername: (context, event) => event.data.bridgeUsername,
            }),
            target: "loadingConfiguration",
          },
        },
      },
      loadingConfiguration: {
        invoke: {
          id: "loadingConfiguration",
          src: async (context) => {
            console.log("Loading configuration…");
            const bridgeConfigString = await LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY);

            if (bridgeConfigString === undefined) {
              return { bridgeConfig: undefined };
            }

            let bridgeConfig = JSON.parse(bridgeConfigString);

            // Override bridge IP address and username if they are loaded from preferences
            bridgeConfig = {
              ...bridgeConfig,
              ...(context.bridgeIpAddress ? { ipAddress: context.bridgeIpAddress } : {}),
              ...(context.bridgeUsername ? { username: context.bridgeUsername } : {}),
            };

            return { bridgeConfig: bridgeConfig };
          },
          onDone: [
            {
              target: "connecting",
              actions: assign({
                bridgeConfig: (context, event) => event.data.bridgeConfig,
              }),
              cond: (context, event) => event.data.bridgeConfig !== undefined,
            },
            {
              target: "linking",
              cond: (context) => context.bridgeIpAddress !== undefined,
            },
            {
              target: "discoveringUsingPublicApi",
            },
          ],
        },
      },
      connecting: {
        invoke: {
          id: "connecting",
          src: async (context) => {
            if (context.bridgeConfig === undefined) {
              throw Error("Bridge configuration is undefined when trying to connect");
            }

            const hueClient = await createHueClient(
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
            actions: assign({
              bridgeIpAddress: (context, event) => event.data.ipAddress,
              bridgeId: (context, event) => event.data.id,
            }),
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
            actions: assign({
              bridgeIpAddress: (context, event) => event.data.ipAddress,
              bridgeId: (context, event) => event.data.id,
            }),
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

            console.log("Linking with Hue Bridge and saving configuration…");

            // TODO: Test cases:
            //  With manual IP
            //  With manual invalid IP
            //  With manual username
            //  With manual invalid username
            //  With manual IP and username
            //  With manual invalid IP and username
            const bridgeConfig = await linkWithBridge(context.bridgeIpAddress, context.bridgeId);

            const hueClient = await createHueClient(
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
            actions: (_, event) => {
              new Toast({ title: "Failed to link with bridge", message: event.data?.toString() }).show().then();
              console.error(event.data);
            },
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
            if (context.bridgeConfig === undefined) {
              throw Error("Bridge configuration is undefined when trying to save it");
            }
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
          src: async () => {
            console.log("Unlinking (clearing configuration)…");
            await LocalStorage.clear();
          },
          onDone: [
            {
              target: "linking",
              actions: assign({
                bridgeUsername: () => getPreferenceValues().bridgeUsername,
                bridgeId: () => undefined,
                bridgeConfig: () => undefined,
              }),
              cond: () => getPreferenceValues().bridgeIpAddress !== undefined,
            },
            {
              target: "discoveringUsingPublicApi",
              actions: assign({
                bridgeIpAddress: () => undefined,
                bridgeUsername: () => getPreferenceValues().bridgeUsername,
                bridgeId: () => undefined,
                bridgeConfig: () => undefined,
              }),
            },
          ],
        },
      },
    },
  });
}
