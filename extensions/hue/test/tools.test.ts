import { describe, expect, it } from "vitest";
import { BRIDGE_CONFIG_KEY } from "../src/helpers/constants";
import controlGroup from "../src/tools/control-group";
import controlLight from "../src/tools/control-light";
import getLights from "../src/tools/get-lights";
import { storage } from "./raycast-stub";
import { html, json, puts, resources, startBridge } from "./fakeBridge";
import * as fixtures from "./fixtures/resources";

const byName = <T extends { metadata: { name: string } }>(items: T[], name: string) =>
  items.find((item) => item.metadata.name === name)!;
const pendant = byName(fixtures.lights, "Kitchen pendant");
const officeCandle = byName(fixtures.lights, "Office candle");

// Saves the fake bridge as linked, as Manage Hue Bridge does.
async function linkBridge() {
  const bridge = await startBridge();
  storage.set(BRIDGE_CONFIG_KEY, JSON.stringify(bridge.config));
  return bridge;
}

describe("get-lights", () => {
  it("describes the rooms and zones with their lights and scenes", async () => {
    await linkBridge();
    const { rooms } = await getLights();
    expect(rooms.find(({ name }) => name === "Office")).toEqual({
      name: "Office",
      on: true,
      brightness: 56,
      lights: ["Office pendant 2", "Office pendant 1", "Office pendant 3", "Office candle"],
      scenes: [{ name: "Relax", active: true }],
    });
    expect(rooms.find(({ name }) => name === "Hallway")).toEqual({
      name: "Hallway",
      on: false,
      lights: [],
      scenes: [{ name: "Relax" }],
    });
  });

  it("describes each light with its room, state, abilities and reachability", async () => {
    await linkBridge();
    const { lights } = await getLights();
    const light = (name: string) => lights.find((light) => light.name === name);
    expect(light("Kitchen pendant")).toEqual({
      name: "Kitchen pendant",
      room: "Kitchen",
      on: true,
      brightness: 100,
      temperature: 2732,
      supports: ["brightness", "temperature"],
    });
    expect(light("Living room plug")).toEqual({
      name: "Living room plug",
      room: "Living room",
      on: true,
      supports: [],
    });
    expect(light("Living room spot 1")).toMatchObject({
      temperature: 2237,
      supports: ["brightness", "color", "temperature"],
      unreachable: true,
    });
  });
});

describe("control-light", () => {
  it("changes a light by name", async () => {
    const bridge = await linkBridge();
    expect(await controlLight({ lights: [" kitchen PENDANT "], on: false })).toBe("Turned off Kitchen pendant.");
    expect(puts(bridge)).toEqual([{ path: `/clip/v2/resource/light/${pendant.id}`, body: { on: { on: false } } }]);
  });

  it("picks the light in the given room", async () => {
    const bridge = await linkBridge();
    const served = fixtures.lights.map((light) =>
      light === officeCandle ? { ...light, metadata: { ...light.metadata, name: "Kitchen pendant" } } : light,
    );
    bridge.routes["GET /clip/v2/resource/light"] = (stream) => json(stream, 200, resources(served));
    await controlLight({ lights: ["Kitchen pendant"], room: "Office", brightness: 30 });
    expect(puts(bridge).map(({ path }) => path)).toEqual([`/clip/v2/resource/light/${officeCandle.id}`]);
  });

  it.each([
    [{ lights: ["Kitchen pendant"] }, "Nothing to change"],
    [{ lights: [], on: true }, "Give at least one light."],
  ])("rejects %o without asking the bridge", async (input, message) => {
    const bridge = await linkBridge();
    await expect(controlLight(input)).rejects.toThrow(message);
    expect(bridge.requests).toEqual([]);
  });

  it("names the lights that failed", async () => {
    const bridge = await linkBridge();
    bridge.routes[`PUT /clip/v2/resource/light/${officeCandle.id}`] = (stream) => html(stream, 500);
    expect(await controlLight({ lights: ["Kitchen pendant", "Office candle"], on: false })).toBe(
      "Turned off Kitchen pendant. Failed Office candle: Status 500 from Hue Bridge.",
    );
  });

  it("rejects when every light failed", async () => {
    const bridge = await linkBridge();
    bridge.routes["PUT /clip/v2/resource/light/"] = (stream) => html(stream, 500);
    await expect(controlLight({ lights: ["Kitchen pendant", "Office candle"], on: false })).rejects.toThrow(
      "Failed Kitchen pendant: Status 500 from Hue Bridge. Failed Office candle: Status 500 from Hue Bridge.",
    );
  });
});

describe("control-group", () => {
  const groupedLight = (id: string) => `/clip/v2/resource/grouped_light/00000000-0000-4000-8000-000000000${id}`;
  const off = { on: { on: false } };

  it("changes a group through its grouped light", async () => {
    const bridge = await linkBridge();
    expect(await controlGroup({ groups: ["office"], on: false })).toBe("Turned off Office.");
    expect(puts(bridge)).toEqual([{ path: groupedLight("045"), body: off }]);
  });

  it("changes groups one after another", async () => {
    const bridge = await linkBridge();
    expect(await controlGroup({ groups: ["Office", "Kitchen"], on: false })).toBe("Turned off Office and Kitchen.");
    expect(puts(bridge)).toEqual([
      { path: groupedLight("045"), body: off },
      { path: groupedLight("043"), body: off },
    ]);
  });

  it("changes a group named twice once", async () => {
    const bridge = await linkBridge();
    expect(await controlGroup({ groups: ["Office", "office"], on: false })).toBe("Turned off Office.");
    expect(puts(bridge)).toHaveLength(1);
  });

  it("names each unreachable light once across overlapping groups", async () => {
    await linkBridge();
    expect(await controlGroup({ groups: ["Living room", "Downstairs"], on: false })).toBe(
      "Turned off Living room and Downstairs. Skipped Living room spot 3, Living room spot 2, Living room spot 1 and " +
        "Living room floor lamp 4: unreachable.",
    );
  });

  it("changes every light through the home's grouped light", async () => {
    const bridge = await linkBridge();
    expect(await controlGroup({ allLights: true, on: false })).toBe(
      "Turned off all lights. Skipped Living room spot 3, Living room spot 2, Studio ceiling lamp, Living room spot 1 " +
        "and Living room floor lamp 4: unreachable.",
    );
    expect(bridge.requests.map(({ path }) => path)).toContain("/clip/v2/resource/bridge_home");
    expect(puts(bridge)).toEqual([{ path: groupedLight("033"), body: off }]);
  });

  it("sends a color to each light, skipping the ones without", async () => {
    const bridge = await linkBridge();
    expect(await controlGroup({ groups: ["Living room"], color: "red" })).toBe(
      "Nothing changed. Skipped Living room floor lamp 2, Living room plug, Living room floor lamp 1 and Living room " +
        "floor lamp 3: no color. Skipped Living room spot 3, Living room spot 2, Living room spot 1 and Living room " +
        "floor lamp 4: unreachable.",
    );
    expect(puts(bridge)).toEqual([]);
  });

  it("skips a room without lights", async () => {
    const bridge = await linkBridge();
    expect(await controlGroup({ groups: ["Hallway"], on: true })).toBe("Nothing changed. Skipped Hallway: no lights.");
    expect(puts(bridge)).toEqual([]);
  });

  it.each([{ on: false }, { groups: ["Office"], allLights: true, on: false }])(
    "rejects %o without asking the bridge",
    async (input) => {
      const bridge = await linkBridge();
      await expect(controlGroup(input)).rejects.toThrow("Give either groups or allLights.");
      expect(bridge.requests).toEqual([]);
    },
  );
});
