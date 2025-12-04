import { assign, createMachine, AnyEventObject } from "xstate";
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

export interface Preferences {
  transitionTime?: string;
  toggleAllLights?: "off" | "on";
  bridgeIpAddress?: string;
  bridgeUsername?: string;
}

type MachineEvent = AnyEventObject;
const getField = (event?: MachineEvent, key?: string) => {
  if (!event) return undefined;
  const d = event.data;
  if (typeof d === "object" && d !== null) return (d as Record<string, unknown>)[key as string];
  return undefined;
};
const getString = (v?: unknown) => (typeof v === "string" ? v : undefined);
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
  return createMachine<HueContext, AnyEventObject>({
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
              throw new Error("Bridge IP address is not a valid IPv4 address");
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
              bridgeIpAddress: (_context: HueContext, event: MachineEvent) =>
                getString(getField(event, "bridgeIpAddress")),
              bridgeUsername: (_context: HueContext, event: MachineEvent) =>
                getString(getField(event, "bridgeUsername")),
            }),
          },
          onError: {
            target: "failedToLoadPreferences",
            actions: (_context: HueContext, event: MachineEvent) => {
              void new Toast({
                style: Style.Failure,
                title: "Failed to load preferences",
                message: String(event?.data ?? ""),
              }).show();
            },
          },
        },
      },
      failedToLoadPreferences: {},
      loadingConfiguration: {
        invoke: {
          id: "loadingConfiguration",
          src: async (context: HueContext) => {
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
                bridgeConfig: (_context: HueContext, event: MachineEvent) =>
                  getField(event, "bridgeConfig") as BridgeConfig | undefined,
              }),
              cond: (_context: HueContext, event: MachineEvent) => getField(event, "bridgeConfig") !== undefined,
            },
            {
              target: "linking",
              cond: (context: HueContext) => !!context.bridgeIpAddress,
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
          src: async (context: HueContext) => {
            if (context.bridgeConfig === undefined) {
              throw new Error("Bridge configuration is undefined when trying to connect");
            }

            const hueClient = await createHueClient(
              context.bridgeConfig,
              setLights,
              setGroupedLights,
              setRooms,
              setZones,
              setScenes,
            );

            void new Toast({ title: "" }).hide();

            return hueClient;
          },
          onDone: {
            actions: assign({
              hueClient: (_context: HueContext, event: MachineEvent) =>
                getField(event, "hueClient") as HueClient | undefined,
            }),
            target: "connected",
          },
          onError: {
            actions: (_: unknown, event: MachineEvent) => {
              console.error(event?.data);
              void new Toast({
                title: "Failed to connect to bridge",
                message: String(event?.data ?? ""),
                style: Style.Failure,
              }).show();
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
                bridgeIpAddress: (_context: HueContext, event: MachineEvent) => getString(getField(event, "ipAddress")),
                bridgeId: (_context: HueContext, event: MachineEvent) => getString(getField(event, "id")),
              }),
              cond: (context: HueContext) => !!context.bridgeUsername,
            },
            {
              target: "linkWithBridge",
              actions: assign({
                bridgeIpAddress: (_context: HueContext, event: MachineEvent) => getString(getField(event, "ipAddress")),
                bridgeId: (_context: HueContext, event: MachineEvent) => getString(getField(event, "id")),
              }),
            },
          ],
          onError: {
            actions: (_: unknown, event: MachineEvent) => console.error(event?.data),
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
                bridgeIpAddress: (_context: HueContext, event: MachineEvent) => getString(getField(event, "ipAddress")),
                bridgeId: (_context: HueContext, event: MachineEvent) => getString(getField(event, "id")),
              }),
              cond: (context: HueContext) => !!context.bridgeUsername,
            },
            {
              actions: assign({
                bridgeIpAddress: (_context: HueContext, event: MachineEvent) => getString(getField(event, "ipAddress")),
                bridgeId: (_context: HueContext, event: MachineEvent) => getString(getField(event, "id")),
              }),
              target: "linkWithBridge",
            },
          ],

          onError: {
            actions: (_: unknown, event: MachineEvent) => console.error(event?.data),
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
          src: async (context: HueContext) => {
            if (context.bridgeIpAddress === undefined) throw new Error("No bridge IP address");
            if (context.bridgeId === undefined) throw new Error("No bridge ID");

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
              bridgeConfig: (_context: HueContext, event: MachineEvent) =>
                getField(event, "bridgeConfig") as BridgeConfig | undefined,
              hueClient: (_context: HueContext, event: MachineEvent) =>
                getField(event, "hueClient") as HueClient | undefined,
            }),
          },
          onError: {
            actions: (_: unknown, event: MachineEvent) => {
              void new Toast({ title: "Failed to link with bridge", message: String(event?.data ?? "") }).show();
              console.error(event?.data);
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
          src: async (context: HueContext) => {
            if (context.bridgeConfig === undefined) {
              throw new Error("Bridge configuration is undefined when trying to save it");
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
