import { connect } from "http2";
import { describe, expect, it, vi } from "vitest";
import { APP_NAME, BRIDGE_CONFIG_KEY, CONNECTION_TIMEOUT_MS } from "../src/helpers/constants";
import HueClient, { UnauthorizedError } from "../src/lib/HueClient";
import {
  clearBridgeConfig,
  connectToBridge,
  createHueClient,
  discoverBridgeUsingHuePublicApi,
  discoverBridgeUsingMdns,
  linkWithBridge,
  loadBridgeConfig,
} from "../src/lib/hueBridge";
import type { BridgeConfig } from "../src/lib/types";
import {
  BRIDGE_ID,
  closedAddress,
  type FakeBridge,
  html,
  json,
  startBridge,
  startSilentServer,
  USERNAME,
} from "./fakeBridge";
import { lights } from "./fixtures/resources";
import { mdns } from "./mocks/bonjour";
import { sleeps } from "./mocks/timersPromises";
import { preferences, storage } from "./raycast-stub";

// Counts connection attempts.
vi.mock("http2", async (importOriginal) => {
  const http2 = await importOriginal<typeof import("http2")>();
  return { ...http2, connect: vi.fn(http2.connect) };
});

const config = (ipAddress: string): BridgeConfig => ({ ipAddress, id: BRIDGE_ID, username: USERNAME });

// MeetHue's discovery endpoint answers with these bridges.
const meetHue = (bridges: object[], init?: ResponseInit) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(bridges, init)),
  );
const found = (internalipaddress: string, id = BRIDGE_ID) => ({ id, internalipaddress, port: 443 });

describe("the TLS connection", () => {
  it("accepts the bridge's certificate whatever the case of its ID", async () => {
    const bridge = await startBridge();
    await expect(createHueClient({ ...bridge.config, id: BRIDGE_ID.toUpperCase() })).resolves.toBeInstanceOf(HueClient);
  });

  it.each([
    ["another bridge's certificate", "impostor"],
    ["a certificate from an untrusted root", "foreign-bridge"],
  ] as const)("rejects %s before sending a request", async (_, certificate) => {
    const bridge = await startBridge({ certificate });
    await expect(createHueClient(bridge.config)).rejects.toThrow();
    expect(bridge.requests).toEqual([]);
  });

  it("times out on a server that never finishes the handshake", async () => {
    const address = await startSilentServer();
    const start = performance.now();
    await expect(createHueClient(config(address))).rejects.toThrow("Connection timed out.");
    expect(performance.now() - start).toBeGreaterThan(CONNECTION_TIMEOUT_MS - 50);
    expect(performance.now() - start).toBeLessThan(CONNECTION_TIMEOUT_MS * 2);
  });

  it("fails at once on a refused connection", async () => {
    const address = await closedAddress();
    const start = performance.now();
    await expect(createHueClient(config(address))).rejects.toThrow(/ECONNREFUSED/);
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("keeps an idle session open past the timeout", async () => {
    const bridge = await startBridge();
    const hueClient = await createHueClient(bridge.config);
    await new Promise((resolve) => setTimeout(resolve, CONNECTION_TIMEOUT_MS + 100));
    await expect(hueClient.getLights()).resolves.toHaveLength(lights.length);
    expect(bridge.sessions).toHaveLength(1);
  });
});

describe("createHueClient", () => {
  it("returns a client once the bridge accepts the username", async () => {
    const bridge = await startBridge();
    const hueClient = await createHueClient(bridge.config);
    expect(hueClient.bridgeConfig).toEqual(bridge.config);
    expect(bridge.requests.map(({ method, path }) => `${method} ${path}`)).toEqual(["GET /clip/v2/resource/bridge"]);
  });

  it.each([
    [403, UnauthorizedError],
    [500, /Status 500/],
  ])("rejects a %i answer and closes the session", async (status, error) => {
    const bridge = await startBridge();
    bridge.routes["GET /clip/v2/resource/bridge"] = (stream) => html(stream, status);
    await expect(createHueClient(bridge.config)).rejects.toThrow(error);
    await vi.waitFor(() => expect(bridge.sessions[0].closed).toBe(true));
  });
});

describe("linkWithBridge", () => {
  const notPressed = [{ error: { type: 101, address: "", description: "link button not pressed" } }];
  const posts = (bridge: FakeBridge) => bridge.requests.filter(({ method }) => method === "POST");

  it("asks once a second, on one session, until the link button is pressed", async () => {
    const bridge = await startBridge();
    const link = bridge.routes["POST /api"];
    let attempts = 0;
    bridge.routes["POST /api"] = (stream, ...rest) =>
      ++attempts < 3 ? json(stream, 200, notPressed) : link(stream, ...rest);
    const { bridgeConfig } = await linkWithBridge(bridge.address, BRIDGE_ID);
    expect(bridgeConfig).toEqual(bridge.config);
    expect(posts(bridge).map(({ body }) => JSON.parse(body))).toEqual(
      Array(3).fill({ devicetype: APP_NAME, generateclientkey: true }),
    );
    expect(bridge.sessions).toHaveLength(1);
    expect(sleeps).toEqual([1000, 1000]);
  });

  it("fails at once on another error, with the bridge's description capitalised", async () => {
    const bridge = await startBridge();
    const description = "invalid value, x, for parameter, devicetype";
    bridge.routes["POST /api"] = (stream) => json(stream, 200, [{ error: { type: 7, address: "/", description } }]);
    await expect(linkWithBridge(bridge.address, BRIDGE_ID)).rejects.toThrow("Invalid value, x, for parameter");
    expect(posts(bridge)).toHaveLength(1);
    expect(sleeps).toEqual([]);
  });

  it("stops asking, and closes the session, when the signal aborts", async () => {
    const bridge = await startBridge();
    const controller = new AbortController();
    bridge.routes["POST /api"] = (stream) => {
      controller.abort();
      json(stream, 200, notPressed);
    };
    await expect(linkWithBridge(bridge.address, BRIDGE_ID, undefined, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(posts(bridge)).toHaveLength(1);
    await vi.waitFor(() => expect(bridge.sessions[0].closed).toBe(true));
  });

  it("gives up after 300 attempts", async () => {
    const bridge = await startBridge();
    bridge.routes["POST /api"] = (stream) => json(stream, 200, notPressed);
    await expect(linkWithBridge(bridge.address, BRIDGE_ID)).rejects.toThrow("Link button not pressed");
    expect(posts(bridge)).toHaveLength(300);
    expect(sleeps).toEqual(Array(299).fill(1000));
  });

  it("checks a given username instead of creating one", async () => {
    const bridge = await startBridge();
    const { bridgeConfig } = await linkWithBridge(bridge.address, BRIDGE_ID, USERNAME);
    expect(bridgeConfig.username).toBe(USERNAME);
    expect(posts(bridge)).toEqual([]);
  });

  it("rejects a given username the bridge rejects with UnauthorizedError", async () => {
    const bridge = await startBridge();
    await expect(linkWithBridge(bridge.address, BRIDGE_ID, "rejected")).rejects.toThrow(UnauthorizedError);
    expect(posts(bridge)).toEqual([]);
  });

  it("takes the bridge ID from the certificate without one", async () => {
    const bridge = await startBridge();
    const { bridgeConfig } = await linkWithBridge(bridge.address);
    expect(bridgeConfig.id).toBe(BRIDGE_ID);
  });
});

describe("connectToBridge", () => {
  // As when the username preference overrides the saved one.
  const saved = (ipAddress: string) => ({ ...config(ipAddress), username: "saved-username" });

  it("finds a bridge whose address changed and saves only its new IP", async () => {
    const bridge = await startBridge();
    const dead = await closedAddress();
    storage.set(BRIDGE_CONFIG_KEY, JSON.stringify(saved(dead)));
    meetHue([found(bridge.address)]);
    const hueClient = await connectToBridge(config(dead));
    expect(hueClient.bridgeConfig).toEqual(bridge.config);
    expect(JSON.parse(storage.get(BRIDGE_CONFIG_KEY)!)).toEqual(saved(bridge.address));
  });

  it("returns the bridge it finds, saving nothing, once unlinked", async () => {
    const bridge = await startBridge();
    meetHue([found(bridge.address)]);
    const hueClient = await connectToBridge(config(await closedAddress()));
    expect(hueClient.bridgeConfig).toEqual(bridge.config);
    expect(storage.size).toBe(0);
  });

  it.each([
    ["the same address", async (dead: string) => [found(dead)], 1],
    ["another bridge", async () => [found((await startBridge({ certificate: "impostor" })).address)], 2],
    ["nothing", async () => [], 1],
  ])("throws the connection error, saving nothing, when it finds %s", async (_, bridges, connections) => {
    const dead = await closedAddress();
    storage.set(BRIDGE_CONFIG_KEY, JSON.stringify(saved(dead)));
    meetHue(await bridges(dead));
    await expect(connectToBridge(config(dead))).rejects.toThrow(/ECONNREFUSED/);
    expect(JSON.parse(storage.get(BRIDGE_CONFIG_KEY)!)).toEqual(saved(dead));
    expect(connect).toHaveBeenCalledTimes(connections);
  });

  it("rejects with the new address, saving it, when the bridge it finds rejects the username", async () => {
    const bridge = await startBridge();
    const dead = await closedAddress();
    storage.set(BRIDGE_CONFIG_KEY, JSON.stringify(saved(dead)));
    meetHue([found(bridge.address)]);
    await expect(connectToBridge({ ...config(dead), username: "rejected" })).rejects.toEqual(
      new UnauthorizedError(bridge.address),
    );
    expect(JSON.parse(storage.get(BRIDGE_CONFIG_KEY)!)).toEqual(saved(bridge.address));
  });

  it("doesn't look for the bridge after it rejects the username", async () => {
    const bridge = await startBridge();
    await expect(connectToBridge({ ...bridge.config, username: "rejected" })).rejects.toThrow(UnauthorizedError);
    expect(fetch).not.toHaveBeenCalled();
    expect(mdns.queries).toBe(0);
  });

  it("doesn't look for the bridge with an IP preference", async () => {
    preferences.bridgeIpAddress = await closedAddress();
    await expect(connectToBridge(config(preferences.bridgeIpAddress))).rejects.toThrow(/ECONNREFUSED/);
    expect(fetch).not.toHaveBeenCalled();
    expect(mdns.queries).toBe(0);
  });
});

describe("loadBridgeConfig", () => {
  const saved = config("192.0.2.2");

  it("is undefined without a saved config", async () => {
    await expect(loadBridgeConfig()).resolves.toBeUndefined();
  });

  it.each([
    ["neither preference", {}, {}],
    ["the IP address preference", { bridgeIpAddress: "192.0.2.3" }, { ipAddress: "192.0.2.3" }],
    ["the username preference", { bridgeUsername: "preference-username" }, { username: "preference-username" }],
  ])("loads the saved config with %s set over it", async (_, set, overridden) => {
    storage.set(BRIDGE_CONFIG_KEY, JSON.stringify(saved));
    Object.assign(preferences, set);
    await expect(loadBridgeConfig()).resolves.toEqual({ ...saved, ...overridden });
  });
});

it("clearBridgeConfig also removes the keys version 1 saved", async () => {
  storage.set(BRIDGE_CONFIG_KEY, JSON.stringify(config("192.0.2.2")));
  storage.set("bridgeIpAddress", "192.0.2.2");
  storage.set("bridgeUsername", USERNAME);
  await clearBridgeConfig();
  expect(storage.size).toBe(0);
});

describe("discoverBridgeUsingMdns", () => {
  it("finds the bridge's IPv4 address and ID", async () => {
    mdns.answer = { addresses: ["fe80::1", "192.0.2.2"], txt: { bridgeid: BRIDGE_ID } };
    await expect(discoverBridgeUsingMdns()).resolves.toEqual({ ipAddress: "192.0.2.2", id: BRIDGE_ID });
    expect(mdns.destroyed).toBe(1);
  });

  it.each([
    ["a bridge with only an IPv6 address", { addresses: ["fe80::1"], txt: { bridgeid: BRIDGE_ID } }],
    ["nothing", null],
  ])("rejects when it finds %s", async (_, answer) => {
    mdns.answer = answer;
    await expect(discoverBridgeUsingMdns()).rejects.toThrow();
    expect(mdns.destroyed).toBe(1);
  });
});

describe("discoverBridgeUsingHuePublicApi", () => {
  it("returns the first bridge's address and ID", async () => {
    meetHue([found("192.0.2.2"), found("192.0.2.3", "001788fffe000002")]);
    await expect(discoverBridgeUsingHuePublicApi()).resolves.toEqual({ ipAddress: "192.0.2.2", id: BRIDGE_ID });
  });

  it.each([
    ["no bridge", [], undefined],
    ["a status other than OK", [found("192.0.2.2")], { status: 429 }],
  ])("rejects on %s", async (_, bridges, init) => {
    meetHue(bridges, init);
    await expect(discoverBridgeUsingHuePublicApi()).rejects.toThrow();
  });
});
