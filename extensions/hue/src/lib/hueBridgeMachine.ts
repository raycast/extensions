import { assign, fromCallback, fromPromise, setup, SnapshotFrom } from "xstate";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import HueClient from "./HueClient";
import { BridgeConfig } from "./types";
import {
  clearBridgeConfig,
  createHueClient,
  discoverBridgeUsingHuePublicApi,
  discoverBridgeUsingMdns,
  linkWithBridge,
  loadBridgeConfig,
  saveBridgeConfig,
} from "./hueBridge";
import * as net from "net";
import { logError } from "../helpers/errors";
import Style = Toast.Style;

type HueContext = {
  bridgeIpAddress?: string;
  bridgeUsername?: string;
  bridgeId?: string;
  bridgeConfig?: BridgeConfig;
  hueClient?: HueClient;
  errorMessage?: string;
};

type LinkInput = { ipAddress?: string; id?: string; username?: string };

export type HueBridgeEvent = { type: "LINK" } | { type: "RETRY" } | { type: "DONE" } | { type: "UNLINK" };
export type SendHueBridgeEvent = (event: HueBridgeEvent) => void;
export type HueBridgeState = SnapshotFrom<typeof hueBridgeMachine>;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Raycast hides whichever toast is showing, so a state's hide must reach it before the next state's show.
let toastRequests = Promise.resolve();
const enqueueToastRequest = (request: () => Promise<void>) => {
  toastRequests = toastRequests.then(request).catch(logError);
};

/**
 * @see https://stately.ai/registry/editor/fb75a44c-277d-49c0-932b-8b447a677ad3?machineId=6977dcc4-09bf-4ae8-b68a-685472f2f9e7
 */
export const hueBridgeMachine = setup({
  types: {} as { context: HueContext; events: HueBridgeEvent },
  actors: {
    loadBridgeConfig: fromPromise(loadBridgeConfig),
    connect: fromPromise(async ({ input, signal }: { input: { bridgeConfig?: BridgeConfig }; signal: AbortSignal }) => {
      if (input.bridgeConfig === undefined) {
        throw Error("Bridge configuration is undefined when trying to connect");
      }

      const hueClient = await createHueClient(input.bridgeConfig);
      // Unlink stops this actor while it connects, which leaves nothing else to close the client.
      if (signal.aborted) {
        hueClient.close();
        throw signal.reason;
      }
      return hueClient;
    }),
    discoverUsingMdns: fromPromise(discoverBridgeUsingMdns),
    discoverUsingPublicApi: fromPromise(discoverBridgeUsingHuePublicApi),
    link: fromPromise(async ({ input, signal }: { input: LinkInput; signal: AbortSignal }) => {
      if (input.ipAddress === undefined) throw Error("No bridge IP address");
      const { bridgeConfig, hueClient } = await linkWithBridge(input.ipAddress, input.id, input.username);
      // Unlink stops this actor while it links: saving after that would undo its clear,
      // and nothing else closes the client.
      try {
        signal.throwIfAborted();
        await saveBridgeConfig(bridgeConfig);
        signal.throwIfAborted();
        return { bridgeConfig, hueClient };
      } catch (error) {
        hueClient.close();
        throw error;
      }
    }),
    unlink: fromPromise(clearBridgeConfig),
    toast: fromCallback(({ input }: { input: Toast.Options }) => {
      let toast: Toast | undefined;
      enqueueToastRequest(async () => void (toast = await showToast(input)));
      return () => enqueueToastRequest(async () => toast?.hide());
    }),
  },
  guards: {
    hasUsername: ({ context }) => context.bridgeUsername !== undefined,
    hasIpAddress: ({ context }) => context.bridgeIpAddress !== undefined,
    hasInvalidIpAddress: ({ context }) => context.bridgeIpAddress !== undefined && !net.isIP(context.bridgeIpAddress),
  },
  actions: {
    logError: (_, params: { error: unknown }) => logError(params.error),
    rememberError: assign({ errorMessage: (_, params: { error: unknown }) => getErrorMessage(params.error) }),
    assignBridge: assign((_, params: { ipAddress: string; id?: string }) => ({
      bridgeIpAddress: params.ipAddress,
      bridgeId: params.id,
    })),
    closeClient: ({ context }) => context.hueClient?.close(),
  },
}).createMachine({
  id: "manage-hue-bridge",
  initial: "loadingPreferences",
  context: {},
  on: {
    UNLINK: {
      target: ".unlinking",
      actions: ["closeClient", assign({ hueClient: undefined, bridgeId: undefined, bridgeConfig: undefined })],
    },
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
            type: "rememberError",
            params: { error: "Bridge IP address is not a valid IPv4 address" },
          },
        },
        { target: "loadingConfiguration" },
      ],
    },
    failedToLoadPreferences: {
      invoke: {
        src: "toast",
        input: ({ context }) => ({
          style: Style.Failure,
          title: "Failed to load preferences",
          message: context.errorMessage,
        }),
      },
    },
    loadingConfiguration: {
      invoke: {
        src: "loadBridgeConfig",
        onDone: [
          {
            guard: ({ event }) => event.output !== undefined,
            target: "connecting",
            actions: assign({ bridgeConfig: ({ event }) => event.output }),
          },
          { guard: "hasIpAddress", target: "waitingForLinkButton" },
          { target: "discovering" },
        ],
        onError: {
          target: "failedToLoadPreferences",
          actions: [
            { type: "logError", params: ({ event }) => ({ error: event.error }) },
            { type: "rememberError", params: ({ event }) => ({ error: event.error }) },
          ],
        },
      },
    },
    connecting: {
      invoke: [
        { src: "toast", input: { style: Style.Animated, title: "Connecting to Hue Bridge…" } },
        {
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
              { type: "rememberError", params: ({ event }) => ({ error: event.error }) },
            ],
          },
        },
      ],
    },
    connected: {},
    failedToConnect: {
      invoke: {
        src: "toast",
        input: ({ context }) => ({
          style: Style.Failure,
          title: "Failed to connect to bridge",
          message: context.errorMessage,
        }),
      },
      on: { RETRY: "connecting" },
    },
    discovering: {
      invoke: { src: "toast", input: { style: Style.Animated, title: "Discovering Hue Bridges…" } },
      initial: "usingMdns",
      states: {
        usingMdns: {
          invoke: {
            src: "discoverUsingMdns",
            onDone: {
              target: "#manage-hue-bridge.waitingForLinkButton",
              actions: { type: "assignBridge", params: ({ event }) => event.output },
            },
            onError: {
              target: "usingPublicApi",
              actions: { type: "logError", params: ({ event }) => ({ error: event.error }) },
            },
          },
        },
        usingPublicApi: {
          invoke: {
            src: "discoverUsingPublicApi",
            onDone: {
              target: "#manage-hue-bridge.waitingForLinkButton",
              actions: { type: "assignBridge", params: ({ event }) => event.output },
            },
            onError: {
              target: "#manage-hue-bridge.noBridgeFound",
              actions: { type: "logError", params: ({ event }) => ({ error: event.error }) },
            },
          },
        },
      },
    },
    noBridgeFound: {
      on: { RETRY: "discovering" },
    },
    waitingForLinkButton: {
      always: { guard: "hasUsername", target: "linking" },
      on: { LINK: "linking" },
    },
    linking: {
      invoke: [
        { src: "toast", input: { style: Style.Animated, title: "Linking with Hue Bridge…" } },
        {
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
              { type: "logError", params: ({ event }) => ({ error: event.error }) },
              { type: "rememberError", params: ({ event }) => ({ error: event.error }) },
            ],
          },
        },
      ],
    },
    failedToLink: {
      invoke: {
        src: "toast",
        input: ({ context }) => ({
          style: Style.Failure,
          title: "Failed to link with bridge",
          message: context.errorMessage,
        }),
      },
      on: { RETRY: "linking" },
    },
    linked: {
      on: { DONE: "connected" },
    },
    unlinking: {
      invoke: {
        src: "unlink",
        onDone: "loadingPreferences",
        onError: {
          target: "loadingPreferences",
          actions: { type: "logError", params: ({ event }) => ({ error: event.error }) },
        },
      },
    },
  },
});
