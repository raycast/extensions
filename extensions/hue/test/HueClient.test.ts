import { describe, expect, it, vi } from "vitest";
import { createHueClient } from "../src/lib/hueBridge";
import type { HueEvent } from "../src/lib/types";
import { startBridge } from "./fakeBridge";
import { lights } from "./fixtures/resources";

const event = (type: HueEvent["type"], data: HueEvent["data"]): HueEvent => ({
  id: `event-${type}`,
  creationtime: "2026-01-01T12:00:00Z",
  type,
  data,
});

describe("listenToEventSource", () => {
  async function listen() {
    const bridge = await startBridge();
    const hueClient = await createHueClient(bridge.config);
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
