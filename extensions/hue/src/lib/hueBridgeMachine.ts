import { assign, setup, fromPromise } from "xstate";
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

export type HueContext = {
  bridgeIpAddress?: string;
  bridgeUsername?: string;
  bridgeId?: string;
  bridgeConfig?: BridgeConfig;
  hueClient?: HueClient;
};

export type MachineEvent = { type: "UNLINK" } | { type: "RETRY" } | { type: "LINK" } | { type: "DONE" };

const loadPreferences = fromPromise<{ bridgeIpAddress?: string; bridgeUsername?: string }, void>(async () => {
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
});

const loadConfiguration = fromPromise<
  { bridgeConfig: BridgeConfig | undefined },
  { bridgeIpAddress?: string; bridgeUsername?: string }
>(async ({ input }) => {
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
});

const createClient = fromPromise<
  HueClient,
  {
    bridgeConfig: BridgeConfig;
    setLights: React.Dispatch<React.SetStateAction<Light[]>>;
    setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>;
    setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
    setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
    setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  }
>(async ({ input }) => {
  if (input.bridgeConfig === undefined) {
    throw new Error("Bridge configuration is undefined when trying to connect");
  }

  const hueClient = await createHueClient(
    input.bridgeConfig,
    input.setLights,
    input.setGroupedLights,
    input.setRooms,
    input.setZones,
    input.setScenes,
  );

  void new Toast({ title: "" }).hide();

  return hueClient;
});

const discoverUsingApi = fromPromise<{ ipAddress: string; id: string }, void>(async () => {
  return await discoverBridgeUsingHuePublicApi();
});

const discoverUsingMdns = fromPromise<{ ipAddress: string; id: string }, void>(async () => {
  return await discoverBridgeUsingMdns();
});

const linkBridge = fromPromise<
  { bridgeConfig: BridgeConfig; hueClient: HueClient },
  {
    bridgeIpAddress: string;
    bridgeId: string;
    bridgeUsername?: string;
    setLights: React.Dispatch<React.SetStateAction<Light[]>>;
    setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>;
    setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
    setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
    setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  }
>(async ({ input }) => {
  if (input.bridgeIpAddress === undefined) throw new Error("No bridge IP address");
  if (input.bridgeId === undefined) throw new Error("No bridge ID");

  console.log("Linking with Hue Bridge and saving configuration…");

  const bridgeConfig = await linkWithBridge(input.bridgeIpAddress, input.bridgeId, input.bridgeUsername);

  const hueClient = await createHueClient(
    bridgeConfig,
    input.setLights,
    input.setGroupedLights,
    input.setRooms,
    input.setZones,
    input.setScenes,
  );

  return { bridgeConfig, hueClient };
});

const saveConfig = fromPromise<void, { bridgeConfig: BridgeConfig }>(async ({ input }) => {
  if (input.bridgeConfig === undefined) {
    throw new Error("Bridge configuration is undefined when trying to save it");
  }
  await LocalStorage.setItem(BRIDGE_CONFIG_KEY, JSON.stringify(input.bridgeConfig));
});

const clearConfig = fromPromise<void, void>(async () => {
  console.log("Unlinking (clearing configuration)…");
  await LocalStorage.clear();
});

export default function hueBridgeMachine(
  setLights: React.Dispatch<React.SetStateAction<Light[]>>,
  setGroupedLights: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>,
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>,
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>,
) {
  return setup({
    types: {
      context: {} as HueContext,
      events: {} as MachineEvent,
    },
    actors: {
      loadPreferences,
      loadConfiguration,
      createClient,
      discoverUsingApi,
      discoverUsingMdns,
      linkBridge,
      saveConfig,
      clearConfig,
    },
  }).createMachine({
    id: "manage-hue-bridge",
    initial: "loadingPreferences",
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
          src: "loadPreferences",
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
              void new Toast({
                style: Style.Failure,
                title: "Failed to load preferences",
                message: String(event.error ?? ""),
              }).show();
            },
          },
        },
      },
      failedToLoadPreferences: {},
      loadingConfiguration: {
        invoke: {
          src: "loadConfiguration",
          input: ({ context }) => ({
            bridgeIpAddress: context.bridgeIpAddress,
            bridgeUsername: context.bridgeUsername,
          }),
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
          src: "createClient",
          input: ({ context }) => ({
            bridgeConfig: context.bridgeConfig!,
            setLights,
            setGroupedLights,
            setRooms,
            setZones,
            setScenes,
          }),
          onDone: {
            actions: assign({
              hueClient: ({ event }) => event.output,
            }),
            target: "connected",
          },
          onError: {
            actions: ({ event }) => {
              console.error(event.error);
              void new Toast({
                title: "Failed to connect to bridge",
                message: String(event.error ?? ""),
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
          src: "discoverUsingApi",
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
          src: "discoverUsingMdns",
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
          src: "linkBridge",
          input: ({ context }) => ({
            bridgeIpAddress: context.bridgeIpAddress!,
            bridgeId: context.bridgeId!,
            bridgeUsername: context.bridgeUsername,
            setLights,
            setGroupedLights,
            setRooms,
            setZones,
            setScenes,
          }),
          onDone: {
            target: "linked",
            actions: assign({
              bridgeConfig: ({ event }) => event.output.bridgeConfig,
              hueClient: ({ event }) => event.output.hueClient,
            }),
          },
          onError: {
            actions: ({ event }) => {
              void new Toast({ title: "Failed to link with bridge", message: String(event.error ?? "") }).show();
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
          src: "saveConfig",
          input: ({ context }) => ({ bridgeConfig: context.bridgeConfig! }),
        },
        on: {
          DONE: {
            target: "connecting",
          },
        },
      },
      unlinking: {
        invoke: {
          src: "clearConfig",
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
