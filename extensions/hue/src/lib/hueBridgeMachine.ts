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
import { discoverBridgeUsingHuePublicApi, discoverBridgeUsingMdns } from "../helpers/hueNetworking";
import { linkWithBridge } from "./linkWithBridge";
import * as net from "net";
import Style = Toast.Style;

export type HueBridgeState = State<
  HueContext,
  AnyEventObject,
  any,
  { value: any; context: HueContext },
  ResolveTypegenMeta<TypegenDisabled, AnyEventObject, BaseActionObject, ServiceMap>
>;

export interface Preferences {
  transitionTime?: string;
  toggleAllLights?: "off" | "on";
  bridgeIpAddress?: string;
  bridgeUsername?: string;
}

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
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>,
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
            const preferences = getPreferenceValues<Preferences>();
            const bridgeIpAddress = preferences.bridgeIpAddress;
            const bridgeUsername = preferences.bridgeUsername;

            if (bridgeIpAddress && !net.isIP(bridgeIpAddress)) {
              throw Error("Bridge IP address is not a valid IPv4 address");
            }

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
            target: "loadingConfiguration",
            actions: assign({
              bridgeIpAddress: (_context, event) => event.data.bridgeIpAddress,
              bridgeUsername: (_context, event) => event.data.bridgeUsername,
            }),
          },
          onError: {
            target: "failedToLoadPreferences",
            actions: (_context, event) => {
              new Toast({
                style: Style.Failure,
                title: "Failed to load preferences",
                message: event.data.message,
              })
                .show()
                .then();
            },
          },
        },
      },
      failedToLoadPreferences: {},
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
                bridgeConfig: (_context, event) => event.data.bridgeConfig,
              }),
              cond: (_context, event) => event.data.bridgeConfig !== undefined,
            },
            {
              target: "linking",
              cond: (context) => !!context.bridgeIpAddress,
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
              setScenes,
            );

            new Toast({ title: "" }).hide().then();

            return hueClient;
          },
          onDone: {
            actions: assign({ hueClient: (_context, event) => event.data }),
            target: "connected",
          },
          onError: {
            actions: (_, event) => {
              console.error(event.data);
              new Toast({
                title: "Failed to connect to bridge",
                message: event.data,
                style: Style.Failure,
              })
                .show()
                .then();
            },
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
          id: "discoverBridgeUsingHuePublicApi",
          src: discoverBridgeUsingHuePublicApi,
          onDone: [
            {
              target: "linking",
              actions: assign({
                bridgeIpAddress: (_context, event) => event.data.ipAddress,
                bridgeId: (_context, event) => event.data.id,
              }),
              cond: (context) => !!context.bridgeUsername,
            },
            {
              target: "linkWithBridge",
              actions: assign({
                bridgeIpAddress: (_context, event) => event.data.ipAddress,
                bridgeId: (_context, event) => event.data.id,
              }),
            },
          ],
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
          onDone: [
            {
              target: "linking",
              actions: assign({
                bridgeIpAddress: (_context, event) => event.data.ipAddress,
                bridgeId: (_context, event) => event.data.id,
              }),
              cond: (context) => !!context.bridgeUsername,
            },
            {
              actions: assign({
                bridgeIpAddress: (_context, event) => event.data.ipAddress,
                bridgeId: (_context, event) => event.data.id,
              }),
              target: "linkWithBridge",
            },
          ],

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
            if (context.bridgeId === undefined) throw Error("No bridge ID");

            console.log("Linking with Hue Bridge and saving configuration…");

            const bridgeConfig = await linkWithBridge(
              context.bridgeIpAddress,
              context.bridgeId,
              context.bridgeUsername,
            );

            const hueClient = await createHueClient(
              bridgeConfig,
              setLights,
              setGroupedLights,
              setRooms,
              setZones,
              setScenes,
            );

            return { bridgeConfig, hueClient };
          },
          onDone: {
            target: "linked",
            actions: assign({
              bridgeConfig: (_context, event) => event.data.bridgeConfig,
              hueClient: (_context, event) => event.data.hueClient,
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
                bridgeUsername: () => getPreferenceValues<Preferences>().bridgeUsername,
                bridgeId: () => undefined,
                bridgeConfig: () => undefined,
              }),
              cond: () => !!getPreferenceValues<Preferences>().bridgeIpAddress,
            },
            {
              target: "discoveringUsingPublicApi",
              actions: assign({
                bridgeIpAddress: () => undefined,
                bridgeUsername: () => getPreferenceValues<Preferences>().bridgeUsername,
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
