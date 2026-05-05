import { AnyEventObject, assign, createMachine, fromPromise, StateValue } from "xstate";
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

export type HueBridgeState = {
  value: StateValue;
  context: HueContext;
  matches: (value: StateValue) => boolean;
};

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
  return createMachine({
    id: "manage-hue-bridge",
    initial: "loadingPreferences",
    types: {} as {
      context: HueContext;
      events: AnyEventObject;
    },
    context: {
      bridgeIpAddress: undefined,
      bridgeUsername: undefined,
      bridgeId: undefined,
      bridgeConfig: undefined,
      hueClient: undefined,
    },
    on: {
      UNLINK: {
        target: ".unlinking",
      },
    },
    states: {
      loadingPreferences: {
        invoke: {
          id: "loadingPreferences",
          src: fromPromise(async () => {
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
          }),
          onDone: {
            target: "loadingConfiguration",
            actions: assign({
              bridgeIpAddress: ({ event }) => event.output.bridgeIpAddress,
              bridgeUsername: ({ event }) => event.output.bridgeUsername,
            }),
          },
          onError: {
            target: "failedToLoadPreferences",
            actions: ({ event }) => {
              const message = event.error instanceof Error ? event.error.message : String(event.error);
              new Toast({
                style: Style.Failure,
                title: "Failed to load preferences",
                message,
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
          src: fromPromise(async ({ input }: { input: HueContext }) => {
            console.log("Loading configuration…");
            const bridgeConfigString = await LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY);

            if (bridgeConfigString === undefined) {
              return { bridgeConfig: undefined };
            }

            let bridgeConfig = JSON.parse(bridgeConfigString);

            // Override bridge IP address and username if they are loaded from preferences
            bridgeConfig = {
              ...bridgeConfig,
              ...(input.bridgeIpAddress ? { ipAddress: input.bridgeIpAddress } : {}),
              ...(input.bridgeUsername ? { username: input.bridgeUsername } : {}),
            };

            return { bridgeConfig: bridgeConfig };
          }),
          input: ({ context }) => context,
          onDone: [
            {
              target: "connecting",
              actions: assign({
                bridgeConfig: ({ event }) => event.output.bridgeConfig,
              }),
              guard: ({ event }) => event.output.bridgeConfig !== undefined,
            },
            {
              target: "linking",
              guard: ({ context }) => !!context.bridgeIpAddress,
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
          src: fromPromise(async ({ input }: { input: HueContext }) => {
            if (input.bridgeConfig === undefined) {
              throw Error("Bridge configuration is undefined when trying to connect");
            }

            const hueClient = await createHueClient(
              input.bridgeConfig,
              setLights,
              setGroupedLights,
              setRooms,
              setZones,
              setScenes,
            );

            new Toast({ title: "" }).hide().then();

            return hueClient;
          }),
          input: ({ context }) => context,
          onDone: {
            actions: assign({ hueClient: ({ event }) => event.output }),
            target: "connected",
          },
          onError: {
            actions: ({ event }) => {
              console.error(event.error);
              const message = event.error instanceof Error ? event.error.message : String(event.error);
              new Toast({
                title: "Failed to connect to bridge",
                message,
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
          src: fromPromise(discoverBridgeUsingHuePublicApi),
          onDone: [
            {
              target: "linking",
              actions: assign({
                bridgeIpAddress: ({ event }) => event.output.ipAddress,
                bridgeId: ({ event }) => event.output.id,
              }),
              guard: ({ context }) => !!context.bridgeUsername,
            },
            {
              target: "linkWithBridge",
              actions: assign({
                bridgeIpAddress: ({ event }) => event.output.ipAddress,
                bridgeId: ({ event }) => event.output.id,
              }),
            },
          ],
          onError: {
            actions: ({ event }) => console.error(event.error),
            target: "discoveringUsingMdns",
          },
        },
      },
      discoveringUsingMdns: {
        invoke: {
          id: "discoverBridgeUsingMdns",
          src: fromPromise(discoverBridgeUsingMdns),
          onDone: [
            {
              target: "linking",
              actions: assign({
                bridgeIpAddress: ({ event }) => event.output.ipAddress,
                bridgeId: ({ event }) => event.output.id,
              }),
              guard: ({ context }) => !!context.bridgeUsername,
            },
            {
              actions: assign({
                bridgeIpAddress: ({ event }) => event.output.ipAddress,
                bridgeId: ({ event }) => event.output.id,
              }),
              target: "linkWithBridge",
            },
          ],

          onError: {
            actions: ({ event }) => console.error(event.error),
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
          src: fromPromise(async ({ input }: { input: HueContext }) => {
            if (input.bridgeIpAddress === undefined) throw Error("No bridge IP address");
            if (input.bridgeId === undefined) throw Error("No bridge ID");

            console.log("Linking with Hue Bridge and saving configuration…");

            const bridgeConfig = await linkWithBridge(input.bridgeIpAddress, input.bridgeId, input.bridgeUsername);

            const hueClient = await createHueClient(
              bridgeConfig,
              setLights,
              setGroupedLights,
              setRooms,
              setZones,
              setScenes,
            );

            return { bridgeConfig, hueClient };
          }),
          input: ({ context }) => context,
          onDone: {
            target: "linked",
            actions: assign({
              bridgeConfig: ({ event }) => event.output.bridgeConfig,
              hueClient: ({ event }) => event.output.hueClient,
            }),
          },
          onError: {
            actions: ({ event }) => {
              const message = event.error instanceof Error ? event.error.message : String(event.error);
              new Toast({ title: "Failed to link with bridge", message }).show().then();
              console.error(event.error);
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
          src: fromPromise(async ({ input }: { input: HueContext }) => {
            if (input.bridgeConfig === undefined) {
              throw Error("Bridge configuration is undefined when trying to save it");
            }
            await LocalStorage.setItem(BRIDGE_CONFIG_KEY, JSON.stringify(input.bridgeConfig));
          }),
          input: ({ context }) => context,
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
          src: fromPromise(async () => {
            console.log("Unlinking (clearing configuration)…");
            await LocalStorage.clear();
          }),
          onDone: [
            {
              target: "linking",
              actions: assign({
                bridgeUsername: () => getPreferenceValues<Preferences>().bridgeUsername,
                bridgeId: () => undefined,
                bridgeConfig: () => undefined,
              }),
              guard: () => !!getPreferenceValues<Preferences>().bridgeIpAddress,
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
