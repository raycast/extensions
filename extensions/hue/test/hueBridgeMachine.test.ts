import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Actor, createActor, waitFor } from "xstate";
import { type HueBridgeState, hueBridgeMachine } from "../src/lib/hueBridgeMachine";
import HueClient, { UnauthorizedError } from "../src/lib/HueClient";
import * as hueBridge from "../src/lib/hueBridge";
import type { BridgeConfig } from "../src/lib/types";
import { preferences, Toast, toasts } from "./raycast-stub";

const { pending } = vi.hoisted(() => ({ pending: () => new Promise<never>(() => {}) }));

vi.mock("../src/lib/hueBridge", () => ({
  loadBridgeConfig: vi.fn(async () => undefined),
  saveBridgeConfig: vi.fn(async () => {}),
  clearBridgeConfig: vi.fn(async () => {}),
  connectToBridge: vi.fn(pending),
  linkWithBridge: vi.fn(pending),
  discoverBridgeUsingMdns: vi.fn(pending),
  discoverBridgeUsingHuePublicApi: vi.fn(pending),
}));

const {
  loadBridgeConfig,
  saveBridgeConfig,
  clearBridgeConfig,
  connectToBridge,
  linkWithBridge,
  discoverBridgeUsingMdns,
  discoverBridgeUsingHuePublicApi,
} = vi.mocked(hueBridge);

type Linked = Awaited<ReturnType<typeof hueBridge.linkWithBridge>>;

const config: BridgeConfig = { ipAddress: "192.0.2.10", id: "001788fffe000001", username: "username" };
const found = { ipAddress: "192.0.2.20", id: config.id };

function fakeClient(bridgeConfig = config, age = 20_000) {
  const client = {
    bridgeConfig,
    createdAt: Date.now() - age,
    close: vi.fn(),
    disconnect: () => {},
    onDisconnect(callback: () => void) {
      client.disconnect = callback;
      return () => {};
    },
  };
  return client as unknown as HueClient & typeof client;
}

const actors: Actor<typeof hueBridgeMachine>[] = [];
function start() {
  const actor = createActor(hueBridgeMachine).start();
  actors.push(actor);
  return actor;
}

afterEach(async () => {
  actors.splice(0).forEach((actor) => actor.stop());
  // Lets the stopped states' toasts hide before the next test clears the log.
  await new Promise((resolve) => setTimeout(resolve));
});

type StateValue = Parameters<HueBridgeState["matches"]>[0];
const reach = (actor: Actor<typeof hueBridgeMachine>, state: StateValue) =>
  waitFor(actor, (snapshot) => snapshot.matches(state), { timeout: 500 });

function visited(actor: Actor<typeof hueBridgeMachine>) {
  const values: unknown[] = [];
  actor.subscribe((snapshot) => values.push(snapshot.value));
  return values;
}

describe("loading the preferences", () => {
  it.each(["192.0.2", "hue-bridge.local", "fe80::1"])(
    "fails with the invalid IP address preference %s, naming it",
    async (ipAddress) => {
      preferences.bridgeIpAddress = ipAddress;
      const actor = start();
      await reach(actor, "failedToLoadPreferences");
      expect(actor.getSnapshot().context.errorMessage).toContain(ipAddress);
      expect(loadBridgeConfig).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["a valid", "192.0.2.10"],
    ["no", ""],
  ])("loads the configuration with %s IP address preference", (_, ipAddress) => {
    preferences.bridgeIpAddress = ipAddress;
    loadBridgeConfig.mockReturnValue(pending());
    const { value, context } = start().getSnapshot();
    expect(value).toBe("loadingConfiguration");
    expect(context.bridgeIpAddress).toBe(ipAddress || undefined);
  });
});

describe("loading the configuration", () => {
  it("connects with a saved configuration", async () => {
    loadBridgeConfig.mockResolvedValue(config);
    const actor = start();
    await reach(actor, "connecting");
    expect(actor.getSnapshot().context.bridgeConfig).toBe(config);
    expect(connectToBridge).toHaveBeenCalledWith(config);
  });

  it("waits for the link button without one, given an IP address preference", async () => {
    preferences.bridgeIpAddress = config.ipAddress;
    await reach(start(), "waitingForLinkButton");
    expect(linkWithBridge).toHaveBeenCalledWith(config.ipAddress, undefined, undefined, expect.any(AbortSignal));
  });

  it("discovers a bridge without one or an IP address preference", async () => {
    await reach(start(), { discovering: "usingMdns" });
    expect(discoverBridgeUsingMdns).toHaveBeenCalled();
  });

  it("fails to load the preferences when the configuration can't be read", async () => {
    loadBridgeConfig.mockRejectedValue(new SyntaxError("Unexpected token"));
    const actor = start();
    await reach(actor, "failedToLoadPreferences");
    expect(actor.getSnapshot().context.errorMessage).toBe("Unexpected token");
  });
});

describe("discovery", () => {
  it("waits for the link button of the bridge mDNS finds", async () => {
    discoverBridgeUsingMdns.mockResolvedValue(found);
    const actor = start();
    await reach(actor, "waitingForLinkButton");
    expect(actor.getSnapshot().context).toMatchObject({ bridgeIpAddress: found.ipAddress, bridgeId: found.id });
    expect(discoverBridgeUsingHuePublicApi).not.toHaveBeenCalled();
  });

  it("falls back to MeetHue when mDNS finds nothing", async () => {
    discoverBridgeUsingMdns.mockRejectedValue(new Error("No Hue Bridge found using mDNS"));
    discoverBridgeUsingHuePublicApi.mockResolvedValue(found);
    const actor = start();
    await reach(actor, "waitingForLinkButton");
    expect(actor.getSnapshot().context).toMatchObject({ bridgeIpAddress: found.ipAddress, bridgeId: found.id });
  });

  it("finds no bridge when mDNS and MeetHue both fail, and discovers again on Retry", async () => {
    discoverBridgeUsingMdns.mockRejectedValue(new Error("No Hue Bridge found using mDNS"));
    discoverBridgeUsingHuePublicApi.mockRejectedValue(new Error("No Hue Bridge found using MeetHue"));
    const actor = start();
    await reach(actor, "noBridgeFound");
    actor.send({ type: "RETRY" });
    expect(actor.getSnapshot().matches("discovering")).toBe(true);
    expect(discoverBridgeUsingMdns).toHaveBeenCalledTimes(2);
  });
});

describe("connecting", () => {
  beforeEach(() => void loadBridgeConfig.mockResolvedValue(config));

  it("keeps the client and its configuration, which may carry a new address", async () => {
    const client = fakeClient({ ...config, ipAddress: "192.0.2.30" });
    connectToBridge.mockResolvedValue(client);
    const actor = start();
    await reach(actor, "connected");
    expect(actor.getSnapshot().context.hueClient).toBe(client);
    expect(actor.getSnapshot().context.bridgeConfig).toBe(client.bridgeConfig);
  });

  it("asks to link again when the bridge rejects the username, and links at the address it answered at", async () => {
    connectToBridge.mockRejectedValue(new UnauthorizedError("192.0.2.30"));
    const actor = start();
    await reach(actor, "unauthorized");
    expect(actor.getSnapshot().context).toMatchObject({ bridgeIpAddress: "192.0.2.30", bridgeId: config.id });
    actor.send({ type: "LINK" });
    expect(actor.getSnapshot().value).toBe("waitingForLinkButton");
    expect(linkWithBridge).toHaveBeenCalledWith("192.0.2.30", config.id, undefined, expect.any(AbortSignal));
  });

  it("fails with the error's message, and connects again on Retry", async () => {
    connectToBridge.mockRejectedValue(new Error("connect ETIMEDOUT"));
    const actor = start();
    await reach(actor, "failedToConnect");
    expect(actor.getSnapshot().context.errorMessage).toBe("connect ETIMEDOUT");
    actor.send({ type: "RETRY" });
    expect(actor.getSnapshot().value).toBe("connecting");
    expect(connectToBridge).toHaveBeenCalledTimes(2);
  });
});

describe("linking", () => {
  it("links with the discovered IP address and ID and the username preference", async () => {
    preferences.bridgeUsername = config.username;
    discoverBridgeUsingMdns.mockResolvedValue(found);
    await reach(start(), "waitingForLinkButton");
    expect(linkWithBridge).toHaveBeenCalledWith(found.ipAddress, found.id, config.username, expect.any(AbortSignal));
  });

  it("saves the configuration it linked with, and keeps its client", async () => {
    preferences.bridgeIpAddress = config.ipAddress;
    const client = fakeClient();
    linkWithBridge.mockResolvedValue({ bridgeConfig: config, hueClient: client });
    const actor = start();
    await reach(actor, "linked");
    expect(saveBridgeConfig).toHaveBeenCalledWith(config);
    expect(actor.getSnapshot().context.hueClient).toBe(client);
    expect(actor.getSnapshot().context.bridgeConfig).toBe(config);
  });

  it("connects with the linked client on Done, without connecting again", async () => {
    preferences.bridgeIpAddress = config.ipAddress;
    const client = fakeClient();
    linkWithBridge.mockResolvedValue({ bridgeConfig: config, hueClient: client });
    const actor = start();
    await reach(actor, "linked");
    actor.send({ type: "DONE" });
    expect(actor.getSnapshot().value).toBe("connected");
    expect(actor.getSnapshot().context.hueClient).toBe(client);
    expect(connectToBridge).not.toHaveBeenCalled();
  });

  it("goes to unauthorized when the bridge rejects the username preference", async () => {
    preferences.bridgeIpAddress = config.ipAddress;
    preferences.bridgeUsername = "rejected";
    linkWithBridge.mockRejectedValue(new UnauthorizedError(config.ipAddress));
    await reach(start(), "unauthorized");
  });

  it("fails with the error's message, and waits for the link button again on Retry", async () => {
    preferences.bridgeIpAddress = config.ipAddress;
    linkWithBridge.mockRejectedValue(new Error("Status 500 from Hue Bridge"));
    const actor = start();
    await reach(actor, "failedToLink");
    expect(actor.getSnapshot().context.errorMessage).toBe("Status 500 from Hue Bridge");
    actor.send({ type: "RETRY" });
    expect(actor.getSnapshot().value).toBe("waitingForLinkButton");
    expect(linkWithBridge).toHaveBeenCalledTimes(2);
  });
});

describe("disconnects", () => {
  beforeEach(() => void loadBridgeConfig.mockResolvedValue(config));

  it("reconnects when a client older than 10 seconds disconnects", async () => {
    const client = fakeClient(config, 20_000);
    connectToBridge.mockResolvedValueOnce(client);
    const actor = start();
    await reach(actor, "connected");
    client.disconnect();
    await reach(actor, "connecting");
    expect(actor.getSnapshot().context.hueClient).toBeUndefined();
    expect(connectToBridge).toHaveBeenCalledTimes(2);
  });

  it("fails to connect when a client younger than 10 seconds disconnects", async () => {
    const client = fakeClient(config, 5_000);
    connectToBridge.mockResolvedValueOnce(client);
    const actor = start();
    await reach(actor, "connected");
    client.disconnect();
    await reach(actor, "failedToConnect");
    expect(actor.getSnapshot().context).toMatchObject({
      hueClient: undefined,
      errorMessage: "Lost connection to Hue Bridge",
    });
    expect(connectToBridge).toHaveBeenCalledTimes(1);
  });
});

describe("Unlink", () => {
  it("clears the configuration, forgets the bridge and starts again from the preferences", async () => {
    discoverBridgeUsingMdns.mockResolvedValueOnce(found);
    linkWithBridge.mockResolvedValue({ bridgeConfig: config, hueClient: fakeClient() });
    const actor = start();
    await reach(actor, "linked");
    actor.send({ type: "UNLINK" });
    expect(actor.getSnapshot().context).toMatchObject({
      hueClient: undefined,
      bridgeId: undefined,
      bridgeConfig: undefined,
    });
    // Starting again from the preferences forgets the discovered address, so it discovers again.
    await reach(actor, { discovering: "usingMdns" });
    expect(clearBridgeConfig).toHaveBeenCalledOnce();
    expect(loadBridgeConfig).toHaveBeenCalledTimes(2);
  });

  it("closes a client that connects after Unlink, without keeping it", async () => {
    loadBridgeConfig.mockResolvedValueOnce(config);
    const connection = Promise.withResolvers<HueClient>();
    connectToBridge.mockReturnValueOnce(connection.promise);
    const actor = start();
    const values = visited(actor);
    await reach(actor, "connecting");
    actor.send({ type: "UNLINK" });
    const client = fakeClient();
    connection.resolve(client);
    await vi.waitFor(() => expect(client.close).toHaveBeenCalled());
    expect(values).not.toContain("connected");
    expect(actor.getSnapshot().context.hueClient).toBeUndefined();
  });

  it("aborts a link in progress", async () => {
    preferences.bridgeIpAddress = config.ipAddress;
    const actor = start();
    await reach(actor, "waitingForLinkButton");
    const signal = linkWithBridge.mock.calls[0][3]!;
    actor.send({ type: "UNLINK" });
    expect(signal.aborted).toBe(true);
  });

  it("closes a client that links after Unlink, without saving or keeping it", async () => {
    preferences.bridgeIpAddress = config.ipAddress;
    const link = Promise.withResolvers<Linked>();
    linkWithBridge.mockReturnValueOnce(link.promise);
    const actor = start();
    const values = visited(actor);
    await reach(actor, "waitingForLinkButton");
    actor.send({ type: "UNLINK" });
    const client = fakeClient();
    link.resolve({ bridgeConfig: config, hueClient: client });
    await vi.waitFor(() => expect(client.close).toHaveBeenCalled());
    expect(saveBridgeConfig).not.toHaveBeenCalled();
    expect(values).not.toContain("linked");
  });

  it("closes a client whose configuration saves after Unlink, without keeping it", async () => {
    preferences.bridgeIpAddress = config.ipAddress;
    const client = fakeClient();
    linkWithBridge.mockResolvedValueOnce({ bridgeConfig: config, hueClient: client });
    const save = Promise.withResolvers<void>();
    saveBridgeConfig.mockReturnValueOnce(save.promise);
    const actor = start();
    const values = visited(actor);
    await vi.waitFor(() => expect(saveBridgeConfig).toHaveBeenCalled());
    actor.send({ type: "UNLINK" });
    save.resolve();
    await vi.waitFor(() => expect(client.close).toHaveBeenCalled());
    expect(values).not.toContain("linked");
  });
});

describe("toasts", () => {
  const log = () => toasts.map(({ event, title }) => `${event} ${title}`);

  it("shows each state's toast on entry and hides it on exit, in order", async () => {
    loadBridgeConfig.mockResolvedValue(config);
    connectToBridge.mockRejectedValueOnce(new Error("connect ETIMEDOUT")).mockResolvedValue(fakeClient());
    const actor = start();
    await reach(actor, "failedToConnect");
    actor.send({ type: "RETRY" });
    await reach(actor, "connected");
    await vi.waitFor(() =>
      expect(log()).toEqual([
        "show Connecting to Hue Bridge…",
        "hide Connecting to Hue Bridge…",
        "show Failed to connect to bridge",
        "hide Failed to connect to bridge",
        "show Connecting to Hue Bridge…",
        "hide Connecting to Hue Bridge…",
      ]),
    );
  });

  it("shows one Discovering toast through mDNS and MeetHue", async () => {
    discoverBridgeUsingMdns.mockRejectedValue(new Error("No Hue Bridge found using mDNS"));
    discoverBridgeUsingHuePublicApi.mockResolvedValue(found);
    await reach(start(), "waitingForLinkButton");
    await vi.waitFor(() =>
      expect(log()).toEqual([
        "show Discovering Hue Bridges…",
        "hide Discovering Hue Bridges…",
        "show Waiting for the link button…",
      ]),
    );
  });

  it("hides the link button's toast when Unlink interrupts", async () => {
    preferences.bridgeIpAddress = config.ipAddress;
    const actor = start();
    await reach(actor, "waitingForLinkButton");
    actor.send({ type: "UNLINK" });
    await vi.waitFor(() => expect(linkWithBridge).toHaveBeenCalledTimes(2));
    await vi.waitFor(() =>
      expect(log()).toEqual([
        "show Waiting for the link button…",
        "hide Waiting for the link button…",
        "show Waiting for the link button…",
      ]),
    );
  });

  it.each<[StateValue, () => void]>([
    ["failedToLoadPreferences", () => (preferences.bridgeIpAddress = "hue-bridge.local")],
    [
      "failedToConnect",
      () => {
        loadBridgeConfig.mockResolvedValue(config);
        connectToBridge.mockRejectedValue(new Error("connect ETIMEDOUT"));
      },
    ],
    [
      "failedToLink",
      () => {
        preferences.bridgeIpAddress = config.ipAddress;
        linkWithBridge.mockRejectedValue(new Error("Status 500 from Hue Bridge"));
      },
    ],
  ])("shows %s's failure toast with the error message", async (state, arrange) => {
    arrange();
    const actor = start();
    await reach(actor, state);
    const { errorMessage } = actor.getSnapshot().context;
    expect(errorMessage).toBeDefined();
    await vi.waitFor(() =>
      expect(toasts.at(-1)).toMatchObject({ event: "show", style: Toast.Style.Failure, message: errorMessage }),
    );
  });
});
