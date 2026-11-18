import { describe, expect, it, vi } from "vitest";
import { CONNECTION_TIMEOUT_MS } from "../src/helpers/constants";
import HueClient, { UnauthorizedError } from "../src/lib/HueClient";
import { createHueClient } from "../src/lib/hueBridge";
import type { HueEvent } from "../src/lib/types";
import { type FakeBridge, html, json, type Route, startBridge } from "./fakeBridge";
import { bridgeHome, lights, rooms, scenes, zigbeeConnectivity, zones } from "./fixtures/resources";
import { sleeps } from "./mocks/timersPromises";

const event = (type: HueEvent["type"], data: HueEvent["data"]): HueEvent => ({
  id: `event-${type}`,
  creationtime: "2026-01-01T12:00:00Z",
  type,
  data,
});

async function connect(options?: Parameters<typeof startBridge>[0]) {
  const bridge = await startBridge(options);
  return { bridge, hueClient: await createHueClient(bridge.config) };
}

// The requests after the one createHueClient makes to check the username.
const requestsAfterConnecting = (bridge: FakeBridge) =>
  bridge.requests.slice(1).map(({ method, path, body }) => ({ method, path, body }));

const change = { on: { on: true } };
const changeRequest = { method: "PUT", path: `/clip/v2/resource/light/${lights[0].id}`, body: JSON.stringify(change) };

describe("listenToEventSource", () => {
  async function listen() {
    const { bridge, hueClient } = await connect();
    const events: HueEvent[] = [];
    const stop = hueClient.listenToEventSource((received) => events.push(received));
    await vi.waitFor(() => expect(bridge.eventStreams).toHaveLength(1));
    return { bridge, hueClient, events, stop };
  }

  it("passes each event whole, with its type", async () => {
    const { bridge, events } = await listen();
    const sent = [
      event("add", [lights[0]]),
      event("update", [{ id: lights[1].id, type: "light", on: { on: true } }]),
      event("delete", [{ id: lights[2].id, type: "light" }]),
      event("error", [{ id: lights[3].id, type: "light" }]),
    ];
    bridge.sendEvents(sent);
    await vi.waitFor(() => expect(events).toEqual(sent));
  });

  it("passes the events of every data line, in order", async () => {
    const { bridge, events } = await listen();
    const first = event("update", [{ id: lights[0].id, type: "light", on: { on: true } }]);
    const second = event("update", [{ id: lights[0].id, type: "light", on: { on: false } }]);
    bridge.write(`data: ${JSON.stringify([first])}\n\ndata: ${JSON.stringify([second])}\n\n`);
    await vi.waitFor(() => expect(events).toEqual([first, second]));
  });

  it("joins a line split across writes", async () => {
    const { bridge, events } = await listen();
    const sent = event("add", [lights[0]]);
    const line = `data: ${JSON.stringify([sent])}\n\n`;
    bridge.write(line.slice(0, 40));
    bridge.write(line.slice(40));
    await vi.waitFor(() => expect(events).toEqual([sent]));
  });

  it("joins a character split across writes", async () => {
    const { bridge, events } = await listen();
    const sent = event("update", [{ id: lights[0].id, type: "light", metadata: { name: "Café" } }]);
    const bytes = Buffer.from(`data: ${JSON.stringify([sent])}\n\n`);
    const split = bytes.indexOf(Buffer.from("é")) + 1;
    bridge.write(bytes.subarray(0, split));
    bridge.write(bytes.subarray(split));
    await vi.waitFor(() => expect(events).toEqual([sent]));
  });

  it("ignores lines other than data", async () => {
    const { bridge, events } = await listen();
    const sent = event("update", [{ id: lights[0].id, type: "light", on: { on: true } }]);
    bridge.write(`: hi\n\nid: 1:0\nevent: message\nretry: 1000\ndata: ${JSON.stringify([sent])}\n\n`);
    await vi.waitFor(() => expect(events).toEqual([sent]));
  });

  it("skips a line it can't parse and keeps listening", async () => {
    const { bridge, events } = await listen();
    const sent = event("update", [{ id: lights[0].id, type: "light", on: { on: true } }]);
    bridge.write(`data: [{"type": "upd\n\n`);
    bridge.sendEvents([sent]);
    await vi.waitFor(() => expect(events).toEqual([sent]));
  });

  it("listens to nothing, without throwing, once the client closed", async () => {
    const { hueClient, bridge } = await listen();
    const closed = new Promise<void>((resolve) => hueClient.onDisconnect(resolve));
    hueClient.close();
    await closed;
    const stop = hueClient.listenToEventSource(() => {});
    expect(stop).not.toThrow();
    expect(bridge.eventStreams).toHaveLength(1);
  });

  it("closes the stream when stopped", async () => {
    const { bridge, stop } = await listen();
    stop();
    await vi.waitFor(() => expect(bridge.eventStreams[0].closed).toBe(true));
  });
});

describe("getResources", () => {
  it("fetches rooms, zones, scenes, Zigbee connectivity and lights one at a time, in that order", async () => {
    const { bridge, hueClient } = await connect();
    expect(await hueClient.getResources()).toEqual({ rooms, zones, scenes, zigbeeConnectivity, lights });
    expect(requestsAfterConnecting(bridge).map(({ path }) => path)).toEqual(
      ["room", "zone", "scene", "zigbee_connectivity", "light"].map((type) => `/clip/v2/resource/${type}`),
    );
    expect(bridge.maxInFlight).toBe(1);
  });
});

describe("getBridgeHome", () => {
  it("fetches the bridge's one home group", async () => {
    const { bridge, hueClient } = await connect();
    expect(await hueClient.getBridgeHome()).toEqual(bridgeHome[0]);
    expect(requestsAfterConnecting(bridge).map(({ path }) => path)).toEqual(["/clip/v2/resource/bridge_home"]);
  });
});

describe("a busy bridge", () => {
  it.each([429, 503])("retries a change answered %i twice, unchanged, after 250 then 500 ms", async (status) => {
    const { bridge, hueClient } = await connect();
    const answer = bridge.routes["PUT /clip/v2/resource/"];
    let attempts = 0;
    bridge.routes["PUT /clip/v2/resource/"] = (stream, body, headers) =>
      ++attempts < 3 ? html(stream, status) : answer(stream, body, headers);
    expect(await hueClient.updateLight(lights[0], change)).toEqual([{ rid: lights[0].id, rtype: "light" }]);
    expect(requestsAfterConnecting(bridge)).toEqual([changeRequest, changeRequest, changeRequest]);
    expect(sleeps).toEqual([250, 500]);
  });
});

describe("an HTML error page", () => {
  it("rejects with UnauthorizedError on 403", async () => {
    const { bridge, hueClient } = await connect();
    bridge.routes["GET /clip/v2/resource/light"] = (stream) => html(stream, 403);
    await expect(hueClient.getLights()).rejects.toThrow(UnauthorizedError);
  });

  it.each([429, 503])("rejects as busy when the third attempt is answered %i too", async (status) => {
    const { bridge, hueClient } = await connect();
    bridge.routes["PUT /clip/v2/resource/"] = (stream) => html(stream, status);
    await expect(hueClient.updateLight(lights[0], change)).rejects.toThrow("Hue Bridge is busy, try again");
    expect(requestsAfterConnecting(bridge)).toEqual([changeRequest, changeRequest, changeRequest]);
  });

  it.each([200, 500])("rejects status %i with an error naming it", async (status) => {
    const { bridge, hueClient } = await connect();
    bridge.routes["GET /clip/v2/resource/light"] = (stream) => html(stream, status);
    await expect(hueClient.getLights()).rejects.toThrow(`Status ${status}`);
  });

  it.each([
    ["", false],
    [", also with the event stream open on a bridge that ignores GOAWAY", true],
  ])("rejects a change answered 403 with UnauthorizedError and disconnects%s", async (_, listening) => {
    const { bridge, hueClient } = await connect({ ignoreGoaway: listening });
    if (listening) {
      hueClient.listenToEventSource(() => {});
      await vi.waitFor(() => expect(bridge.eventStreams).toHaveLength(1));
    }
    const onDisconnect = vi.fn();
    hueClient.onDisconnect(onDisconnect);
    bridge.routes["PUT /clip/v2/resource/"] = (stream) => html(stream, 403);
    await expect(hueClient.updateLight(lights[0], change)).rejects.toThrow(UnauthorizedError);
    await vi.waitFor(() => expect(onDisconnect).toHaveBeenCalled());
  });
});

describe("a JSON response with errors", () => {
  it.each([200, 400])("rejects status %i with the error descriptions joined", async (status) => {
    const { bridge, hueClient } = await connect();
    const errors = [{ description: "device (light) is unreachable" }, { description: "invalid value for on" }];
    bridge.routes["PUT /clip/v2/resource/"] = (stream) => json(stream, status, { errors, data: [] });
    await expect(hueClient.updateLight(lights[0], change)).rejects.toThrow(
      /^device \(light\) is unreachable, invalid value for on$/,
    );
  });

  it("resolves a group change the bridge says may have no effect on lights that are soft off", async () => {
    const { bridge, hueClient } = await connect();
    const errors = [{ description: 'device (grouped_light) is "soft off", command (.on) may not have effect' }];
    bridge.routes["PUT /clip/v2/resource/"] = (stream) => json(stream, 207, { errors, data: [] });
    await expect(hueClient.updateGroupedLight({ id: "grouped-light" }, { on: { on: false } })).resolves.toEqual([]);
  });
});

describe("a request the bridge never answers", () => {
  it("rejects after the timeout and destroys the session", async () => {
    const { bridge, hueClient } = await connect();
    bridge.routes["GET /clip/v2/resource/light"] = () => {};
    const onDisconnect = vi.fn();
    hueClient.onDisconnect(onDisconnect);
    await expect(hueClient.getLights()).rejects.toThrow("timed out");
    await vi.waitFor(() => expect(onDisconnect).toHaveBeenCalled());
  });

  it("fails the changes queued behind it at once", async () => {
    const { bridge, hueClient } = await connect();
    bridge.routes["PUT /clip/v2/resource/"] = () => {};
    const started = Date.now();
    const results = await Promise.allSettled(lights.slice(0, 3).map((light) => hueClient.updateLight(light, change)));
    expect(results.map(({ status }) => status)).toEqual(["rejected", "rejected", "rejected"]);
    // One timeout, then the queue's 100 ms apart, rather than a timeout each
    expect(Date.now() - started).toBeLessThan(2 * CONNECTION_TIMEOUT_MS);
  });
});

describe("a connection dropped mid-request", () => {
  it.each<[string, Route]>([
    ["session", (stream) => stream.session?.destroy()],
    ["stream", (stream) => stream.destroy()],
  ])("rejects when the bridge destroys the %s", async (_, drop) => {
    const { bridge, hueClient } = await connect();
    bridge.routes["GET /clip/v2/resource/light"] = drop;
    await expect(hueClient.getLights()).rejects.toThrow("Lost connection to Hue Bridge");
  });
});

describe("onDisconnect", () => {
  const listen = async (bridge: FakeBridge, hueClient: HueClient) => {
    hueClient.listenToEventSource(() => {});
    await vi.waitFor(() => expect(bridge.eventStreams).toHaveLength(1));
  };

  it.each<[string, (bridge: FakeBridge, hueClient: HueClient) => unknown]>([
    ["the bridge destroys the session", (bridge) => bridge.sessions[0].destroy()],
    [
      // The event stream keeps the session open, so only the GOAWAY tells.
      "the bridge sends GOAWAY",
      async (bridge, hueClient) => {
        await listen(bridge, hueClient);
        bridge.sessions[0].close();
      },
    ],
    [
      "the event stream ends",
      async (bridge, hueClient) => {
        await listen(bridge, hueClient);
        bridge.eventStreams[0].end();
      },
    ],
    [
      "the bridge answers the event stream with 403",
      (bridge, hueClient) => {
        bridge.routes["GET /eventstream/clip/v2"] = (stream) => html(stream, 403);
        hueClient.listenToEventSource(() => {});
      },
    ],
  ])("calls back when %s", async (_, cause) => {
    const { bridge, hueClient } = await connect();
    const onDisconnect = vi.fn();
    hueClient.onDisconnect(onDisconnect);
    await cause(bridge, hueClient);
    await vi.waitFor(() => expect(onDisconnect).toHaveBeenCalled());
  });

  it("calls back at once for a client already closed", async () => {
    const { hueClient } = await connect();
    hueClient.close();
    const onDisconnect = vi.fn();
    hueClient.onDisconnect(onDisconnect);
    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("stops calling back once unsubscribed", async () => {
    const { bridge, hueClient } = await connect();
    const unsubscribed = vi.fn();
    const subscribed = vi.fn();
    hueClient.onDisconnect(unsubscribed)();
    hueClient.onDisconnect(subscribed);
    bridge.sessions[0].destroy();
    await vi.waitFor(() => expect(subscribed).toHaveBeenCalled());
    expect(unsubscribed).not.toHaveBeenCalled();
  });
});
