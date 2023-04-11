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
import { BRIDGE_CERT_FINGERPRINT, BRIDGE_ID_KEY, BRIDGE_IP_ADDRESS_KEY, BRIDGE_USERNAME_KEY } from "./constants";
import HueClient from "./HueClient";
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
  bridgeCertFingerprint?: string;
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
            const [bridgeIpAddress, bridgeId, bridgeUsername, bridgeCertFingerprint] = await Promise.all([
              LocalStorage.getItem<string>(BRIDGE_IP_ADDRESS_KEY),
              LocalStorage.getItem<string>(BRIDGE_ID_KEY),
              LocalStorage.getItem<string>(BRIDGE_USERNAME_KEY),
              LocalStorage.getItem<string>(BRIDGE_CERT_FINGERPRINT),
            ]);

            if (bridgeIpAddress === undefined || bridgeId === undefined || bridgeUsername === undefined) {
              throw Error("No Hue Bridge credentials found");
            }

            return { bridgeIpAddress, bridgeId, bridgeUsername, bridgeCertFingerprint };
          },
          onDone: {
            actions: assign({
              bridgeIpAddress: (context, event) => event.data.bridgeIpAddress,
              bridgeId: (context, event) => event.data.bridgeId,
              bridgeUsername: (context, event) => event.data.bridgeUsername,
              bridgeCertFingerprint: (context, event) => event.data.bridgeCertFingerprint,
            }),
            target: "connecting",
          },
          onError: {
            // This is expected if the user has not yet linked their bridge
            actions: (_, event) => console.info(event.data.message),
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

            const hueClient = await HueClient.createInstance(
              context.bridgeIpAddress,
              context.bridgeId,
              context.bridgeUsername,
              context.bridgeCertFingerprint,
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
            const username = await getUsernameFromBridge(context.bridgeIpAddress);

            // Get bridge ID using the new credentials
            const api = await v3.api.createLocal(context.bridgeIpAddress).connect(username);
            const configuration = await api.configuration.getConfiguration();

            // Set the new credentials. They will be unset if the linking fails.
            LocalStorage.setItem(BRIDGE_IP_ADDRESS_KEY, context.bridgeIpAddress).then();
            LocalStorage.setItem(BRIDGE_ID_KEY, configuration.bridgeid).then();
            LocalStorage.setItem(BRIDGE_USERNAME_KEY, username).then();

            const hueClient = await HueClient.createInstance(
              context.bridgeIpAddress,
              configuration.bridgeid,
              username,
              undefined,
              setLights,
              setGroupedLights,
              setRooms,
              setZones,
              setScenes
            );

            return { bridgeId: configuration.bridgeid, bridgeUsername: username, hueClient };
          },
          onDone: {
            target: "connecting",
            actions: assign({
              bridgeId: (context, event) => event.data.bridgeId,
              bridgeUsername: (context, event) => event.data.bridgeUsername,
              hueClient: (context, event) => event.data.hueClient,
            }),
          },
          onError: {
            actions: (_, event) => {
              console.error(event.data);
              LocalStorage.clear().then();
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
