import { assign, fromPromise, setup, SnapshotFrom } from "xstate";
import { getPreferenceValues, LocalStorage, Toast } from "@raycast/api";
import { BRIDGE_CONFIG_KEY } from "../helpers/constants";
import HueClient from "./HueClient";
import { BridgeConfig } from "./types";
import createHueClient, { loadBridgeConfig } from "./createHueClient";
import { discoverBridgeUsingHuePublicApi, discoverBridgeUsingMdns } from "../helpers/hueNetworking";
import { linkWithBridge } from "./linkWithBridge";
import * as net from "net";
import { logError } from "../helpers/errors";
import Style = Toast.Style;

type HueContext = {
  bridgeIpAddress?: string;
  bridgeUsername?: string;
  bridgeId?: string;
  bridgeConfig?: BridgeConfig;
  hueClient?: HueClient;
};

export type HueBridgeEvent = { type: "LINK" } | { type: "RETRY" } | { type: "DONE" } | { type: "UNLINK" };
export type SendHueBridgeEvent = (event: HueBridgeEvent) => void;
export type HueBridgeState = SnapshotFrom<typeof hueBridgeMachine>;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * @see https://stately.ai/viz/5dacdcc5-0f75-4620-9330-3455876b2e50
 */
export const hueBridgeMachine = setup({
  types: {} as { context: HueContext; events: HueBridgeEvent },
  actors: {
    loadBridgeConfig: fromPromise(loadBridgeConfig),
    connect: fromPromise(async ({ input }: { input: { bridgeConfig?: BridgeConfig } }) => {
      if (input.bridgeConfig === undefined) {
        throw Error("Bridge configuration is undefined when trying to connect");
      }

      const hueClient = await createHueClient(input.bridgeConfig);

      new Toast({ title: "" }).hide().then();

      return hueClient;
    }),
    discoverUsingMdns: fromPromise(discoverBridgeUsingMdns),
    discoverUsingPublicApi: fromPromise(discoverBridgeUsingHuePublicApi),
    link: fromPromise(async ({ input }: { input: { ipAddress?: string; id?: string; username?: string } }) => {
      if (input.ipAddress === undefined) throw Error("No bridge IP address");
      const bridgeConfig = await linkWithBridge(input.ipAddress, input.id, input.username);
      return { bridgeConfig, hueClient: await createHueClient(bridgeConfig) };
    }),
    saveBridgeConfig: fromPromise(async ({ input }: { input: { bridgeConfig?: BridgeConfig } }) => {
      if (input.bridgeConfig === undefined) {
        throw Error("Bridge configuration is undefined when trying to save it");
      }
      await LocalStorage.setItem(BRIDGE_CONFIG_KEY, JSON.stringify(input.bridgeConfig));
    }),
    unlink: fromPromise(() => LocalStorage.clear()),
  },
  guards: {
    hasUsername: ({ context }) => context.bridgeUsername !== undefined,
    hasIpAddress: ({ context }) => context.bridgeIpAddress !== undefined,
    hasInvalidIpAddress: ({ context }) => context.bridgeIpAddress !== undefined && !net.isIP(context.bridgeIpAddress),
  },
  actions: {
    logError: (_, params: { error: unknown }) => logError(params.error),
    showToast: (_, params: Toast.Options) => {
      new Toast(params).show().then();
    },
    assignBridge: assign((_, params: { ipAddress: string; id?: string }) => ({
      bridgeIpAddress: params.ipAddress,
      bridgeId: params.id,
    })),
  },
}).createMachine({
  id: "manage-hue-bridge",
  initial: "loadingPreferences",
  context: {},
  on: {
    UNLINK: ".unlinking",
  },
  states: {
    loadingPreferences: {
      entry: assign(() => {
        const { bridgeIpAddress, bridgeUsername } = getPreferenceValues<Preferences>();
        return { bridgeIpAddress: bridgeIpAddress || undefined, bridgeUsername: bridgeUsername || undefined };
      }),
      always: [
        {
          guard: "hasInvalidIpAddress",
          target: "failedToLoadPreferences",
          actions: {
            type: "showToast",
            params: {
              style: Style.Failure,
              title: "Failed to load preferences",
              message: "Bridge IP address is not a valid IPv4 address",
            },
          },
        },
        { target: "loadingConfiguration" },
      ],
    },
    failedToLoadPreferences: {},
    loadingConfiguration: {
      invoke: {
        src: "loadBridgeConfig",
        onDone: [
          {
            guard: ({ event }) => event.output !== undefined,
            target: "connecting",
            actions: assign({ bridgeConfig: ({ event }) => event.output }),
          },
          { guard: "hasIpAddress", target: "linking" },
          { target: "discoveringUsingMdns" },
        ],
      },
    },
    connecting: {
      invoke: {
        src: "connect",
        input: ({ context }) => ({ bridgeConfig: context.bridgeConfig }),
        onDone: {
          target: "connected",
          actions: assign({ hueClient: ({ event }) => event.output }),
        },
        onError: {
          target: "failedToConnect",
          actions: [
            { type: "logError", params: ({ event }) => ({ error: event.error }) },
            {
              type: "showToast",
              params: ({ event }) => ({
                style: Style.Failure,
                title: "Failed to connect to bridge",
                message: getErrorMessage(event.error),
              }),
            },
          ],
        },
      },
    },
    connected: {},
    failedToConnect: {
      on: { RETRY: "connecting" },
    },
    discoveringUsingMdns: {
      invoke: {
        src: "discoverUsingMdns",
        onDone: {
          target: "waitingForLinkButton",
          actions: { type: "assignBridge", params: ({ event }) => event.output },
        },
        onError: {
          target: "discoveringUsingPublicApi",
          actions: { type: "logError", params: ({ event }) => ({ error: event.error }) },
        },
      },
    },
    discoveringUsingPublicApi: {
      invoke: {
        src: "discoverUsingPublicApi",
        onDone: {
          target: "waitingForLinkButton",
          actions: { type: "assignBridge", params: ({ event }) => event.output },
        },
        onError: {
          target: "noBridgeFound",
          actions: { type: "logError", params: ({ event }) => ({ error: event.error }) },
        },
      },
    },
    noBridgeFound: {
      on: { RETRY: "discoveringUsingMdns" },
    },
    waitingForLinkButton: {
      always: { guard: "hasUsername", target: "linking" },
      on: { LINK: "linking" },
    },
    linking: {
      invoke: {
        src: "link",
        input: ({ context }) => ({
          ipAddress: context.bridgeIpAddress,
          id: context.bridgeId,
          username: context.bridgeUsername,
        }),
        onDone: {
          target: "linked",
          actions: assign(({ event }) => event.output),
        },
        onError: {
          target: "failedToLink",
          actions: [
            {
              type: "showToast",
              params: ({ event }) => ({ title: "Failed to link with bridge", message: getErrorMessage(event.error) }),
            },
            { type: "logError", params: ({ event }) => ({ error: event.error }) },
          ],
        },
      },
    },
    failedToLink: {
      on: { RETRY: "linking" },
    },
    linked: {
      invoke: {
        src: "saveBridgeConfig",
        input: ({ context }) => ({ bridgeConfig: context.bridgeConfig }),
      },
      on: { DONE: "connecting" },
    },
    unlinking: {
      invoke: {
        src: "unlink",
        onDone: [
          {
            guard: () => !!getPreferenceValues<Preferences>().bridgeIpAddress,
            target: "linking",
            actions: assign({
              bridgeUsername: () => getPreferenceValues<Preferences>().bridgeUsername || undefined,
              bridgeId: undefined,
              bridgeConfig: undefined,
            }),
          },
          {
            target: "discoveringUsingMdns",
            actions: assign({
              bridgeIpAddress: undefined,
              bridgeUsername: () => getPreferenceValues<Preferences>().bridgeUsername || undefined,
              bridgeId: undefined,
              bridgeConfig: undefined,
            }),
          },
        ],
      },
    },
  },
});
