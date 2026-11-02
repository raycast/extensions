import { describe, expect, it, vi } from "vitest";
import { hexToXy } from "../src/helpers/colors";
import { BRIDGE_CONFIG_KEY } from "../src/helpers/constants";
import { getLightsFromGroup } from "../src/helpers/hueResources";
import {
  type Change,
  findGroup,
  findLight,
  findScene,
  getGroupedLightId,
  type GroupTarget,
  type Outcome,
  type Resources,
  summarize,
  updateGroup,
  updateLights,
  parseChange,
  withHueClient,
} from "../src/helpers/tools";
import type { Group, Light, ZigbeeConnectivity } from "../src/lib/types";
import { storage } from "./raycast-stub";
import { startBridge } from "./fakeBridge";
import { fakeClient } from "./fakeHue";
import { lights, rooms, scenes, zigbeeConnectivity, zones } from "./fixtures/resources";

const resources: Resources = { rooms, zones, scenes, zigbeeConnectivity, lights };
const byName = <T extends { metadata: { name: string } }>(items: T[], name: string) =>
  items.find((item) => item.metadata.name === name)!;

describe("withHueClient", () => {
  it("rejects without a saved bridge", async () => {
    await expect(withHueClient(async () => "ran")).rejects.toThrow("No Hue Bridge configured");
  });

  async function linkBridge() {
    const bridge = await startBridge();
    storage.set(BRIDGE_CONFIG_KEY, JSON.stringify(bridge.config));
    return bridge;
  }

  it("resolves what run returns, and closes the client after", async () => {
    await linkBridge();
    const onDisconnect = vi.fn();
    const result = await withHueClient(async (hueClient) => {
      hueClient.onDisconnect(onDisconnect);
      return "ran";
    });
    expect(result).toBe("ran");
    await vi.waitFor(() => expect(onDisconnect).toHaveBeenCalled());
  });

  it("rejects with run's error, and closes the client after", async () => {
    await linkBridge();
    const onDisconnect = vi.fn();
    const failing = withHueClient(async (hueClient) => {
      hueClient.onDisconnect(onDisconnect);
      throw new Error("Status 500 from Hue Bridge");
    });
    await expect(failing).rejects.toThrow("Status 500 from Hue Bridge");
    await vi.waitFor(() => expect(onDisconnect).toHaveBeenCalled());
  });
});

describe("findLight", () => {
  it("matches the whole trimmed name, whatever the case", () => {
    expect(findLight(resources, " kitchen PENDANT ")).toBe(byName(lights, "Kitchen pendant"));
  });

  it("lists the lights with their rooms for an unknown name", () => {
    expect(() => findLight(resources, "Desk lamp")).toThrow(/Kitchen pendant \(Kitchen\).*Office candle \(Office\)/);
  });

  it("points a room's name to Control Group", () => {
    expect(() => findLight(resources, "living room")).toThrow("living room is a room: use Control Group.");
  });

  describe("two lights with the same name", () => {
    const officeCandle = byName(lights, "Office candle");
    const renamed = { ...officeCandle, metadata: { ...officeCandle.metadata, name: "Kitchen pendant" } };
    const twice = { ...resources, lights: lights.map((light) => (light === officeCandle ? renamed : light)) };

    it("lists them with their rooms, pointing to room", () => {
      expect(() => findLight(twice, "Kitchen pendant")).toThrow(
        "2 lights are named Kitchen pendant: Kitchen pendant (Kitchen), Kitchen pendant (Office). Pass room to pick one.",
      );
    });

    it("picks the one in the given room", () => {
      expect(findLight(twice, "Kitchen pendant", "office")).toBe(renamed);
    });
  });
});

describe("findGroup", () => {
  it("finds a zone", () => {
    expect(findGroup(resources, "upstairs")).toBe(byName(zones, "Upstairs"));
  });

  it("prefers a room to a zone with the same name", () => {
    const zone = { ...zones[0], metadata: { ...zones[0].metadata, name: "Office" } };
    expect(findGroup({ ...resources, zones: [zone, ...zones.slice(1)] }, "Office")).toBe(byName(rooms, "Office"));
  });

  it("rejects a name two rooms match, also differing in case", () => {
    const office = byName(rooms, "Office");
    const copy = { ...office, id: "copy", metadata: { ...office.metadata, name: "office" } };
    expect(() => findGroup({ ...resources, rooms: [...rooms, copy] }, "Office")).toThrow(
      "2 rooms match Office: Office, office. Rename one in the Hue app.",
    );
  });

  it("points a light's name to Control Light from Control Group", () => {
    expect(() => findGroup(resources, "Kitchen pendant", true)).toThrow(
      "Kitchen pendant is a light: use Control Light.",
    );
  });

  it("says a light's name is a light from the other tools", () => {
    expect(() => findGroup(resources, "Kitchen pendant")).toThrow("Kitchen pendant is a light, not a room or zone.");
  });

  it("lists the rooms and zones for an unknown name, pointing Control Group to allLights", () => {
    expect(() => findGroup(resources, "all", true)).toThrow(
      /^No room or zone named all\. Rooms: .*For every light, use allLights\.$/,
    );
  });

  it("leaves allLights out for the other tools", () => {
    expect(() => findGroup(resources, "all")).toThrow(/^No room or zone named all\. Rooms: (?!.*allLights)/);
  });
});

describe("findScene", () => {
  it("finds a scene with its group's name", () => {
    expect(findScene(resources, "bright")).toEqual({ scene: byName(scenes, "Bright"), group: "Living room" });
  });

  it("lists the groups of a scene name several have, pointing to group", () => {
    expect(() => findScene(resources, "Relax")).toThrow(
      /^Relax is a scene in (?=.*Office)(?=.*Bedroom)(?=.*Studio).*Pass group to pick one\.$/,
    );
  });

  it.each([
    ["Relax", "bedroom", "Bedroom"],
    ["Nightlight", "Downstairs", "Downstairs"],
  ])("picks %s in %s", (name, group, groupName) => {
    const scene = scenes.find(
      ({ metadata, group: { rid } }) => metadata.name === name && rid === byName([...rooms, ...zones], groupName).id,
    );
    expect(findScene(resources, name, group)).toEqual({ scene, group: groupName });
  });

  it("lists the group's scenes when it doesn't have the name", () => {
    expect(() => findScene(resources, "Work", "Kitchen")).toThrow(
      "Kitchen has no scene named Work. Its scenes: Energize.",
    );
  });
});

describe("parseChange", () => {
  it.each<[Change, string]>([
    [{}, "Nothing to change"],
    [{ on: false, brightness: 50 }, "Turning off can't be combined"],
    [{ on: true, brightnessChange: 10 }, "can't be combined with on"],
    [{ brightness: 0 }, "use on: false"],
    [{ brightness: 101 }, "Brightness 101 is outside 1-100"],
    [{ brightnessChange: 0 }, "brightnessChange 0"],
    [{ brightnessChange: -150 }, "brightnessChange -150"],
    [{ color: "red", temperature: 2700 }, "Give only one of color, temperature and temperatureChange"],
    [{ temperature: 2700, temperatureChange: "warmer" }, "can't be combined with on, brightness, color or temperature"],
    [{ color: "blurple" }, "Unknown color blurple"],
    [{ temperature: 370 }, "Kelvin"],
  ])("rejects %o", (change, message) => {
    expect(() => parseChange(change)).toThrow(message);
  });

  it.each<Change>([
    { color: "Dark Red" },
    { color: "#FF8800" },
    { on: true, brightness: 30 },
    { brightnessChange: -20, temperatureChange: "cooler" },
  ])("accepts %o", (change) => {
    expect(parseChange(change)).toMatchObject(change);
  });

  it("ignores keys that aren't changes", () => {
    expect(() => parseChange({ scene: "Relax" } as Change)).toThrow("Nothing to change");
  });
});

const pendant = byName(lights, "Kitchen pendant");
const plug = byName(lights, "Living room plug");
const spot1 = byName(lights, "Living room spot 1");
const office = byName(rooms, "Office");
const livingRoom = byName(rooms, "Living room");
const OFFICE_GROUPED_LIGHT = "00000000-0000-4000-8000-000000000045";
const LIVING_ROOM_UNREACHABLE = [
  "Living room spot 3",
  "Living room spot 2",
  "Living room spot 1",
  "Living room floor lamp 4",
];

describe("updateLights", () => {
  async function update(targets: Light[], change: Change, connectivity: ZigbeeConnectivity[] = zigbeeConnectivity) {
    const hueClient = fakeClient();
    const outcomes = await updateLights(hueClient, targets, change, connectivity);
    return { calls: hueClient.updateLight.mock.calls, outcomes };
  }

  it("turns a light off", async () => {
    expect(await update([pendant], { on: false })).toEqual({
      calls: [[pendant, { on: { on: false } }]],
      outcomes: [{ name: "Kitchen pendant" }],
    });
  });

  it("sets the brightness and turns the light on", async () => {
    const { calls } = await update([pendant], { brightness: 30 });
    expect(calls).toEqual([[pendant, { on: { on: true }, dimming: { brightness: 30 } }]]);
  });

  it("sets a temperature in Kelvin as mirek", async () => {
    expect(await update([pendant], { temperature: 2700 })).toEqual({
      calls: [[pendant, { on: { on: true }, color_temperature: { mirek: 370 } }]],
      outcomes: [{ name: "Kitchen pendant" }],
    });
  });

  it("clamps a temperature to the light's range and reports where it stopped", async () => {
    expect(await update([pendant], { temperature: 2000 })).toEqual({
      calls: [[pendant, { on: { on: true }, color_temperature: { mirek: 454 } }]],
      outcomes: [{ name: "Kitchen pendant", limit: 2203 }],
    });
  });

  it("dims by a delta, without on", async () => {
    const { calls } = await update([pendant], { brightnessChange: -20 });
    expect(calls).toEqual([[pendant, { dimming_delta: { action: "down", brightness_delta: 20 } }]]);
  });

  it("warms by one step, without on", async () => {
    const { calls } = await update([pendant], { temperatureChange: "warmer" });
    expect(calls).toEqual([[pendant, { color_temperature_delta: { action: "up", mirek_delta: 35 } }]]);
  });

  it("sets a color without a brightness", async () => {
    const { calls } = await update([spot1], { color: "Dark Red" }, []);
    expect(calls).toEqual([[spot1, { on: { on: true }, color: { xy: hexToXy("#8b0000").xy } }]]);
  });

  it.each<[string, Light, Change, string]>([
    ["a plug's brightness", plug, { brightness: 30 }, "no brightness"],
    ["a white light's color", pendant, { color: "red" }, "no color"],
    ["a plug's temperature", plug, { temperature: 2700 }, "no white temperature"],
    ["a delta for a light that is off", { ...pendant, on: { on: false } }, { brightnessChange: 10 }, "off"],
    ["an unreachable light", spot1, { on: true }, "unreachable"],
  ])("skips %s", async (_, light, change, skipped) => {
    expect(await update([light], change)).toEqual({ calls: [], outcomes: [{ name: light.metadata.name, skipped }] });
  });

  it("reports the bridge's error", async () => {
    const hueClient = fakeClient();
    hueClient.updateLight.mockRejectedValue(new Error("Hue Bridge is busy, try again"));
    expect(await updateLights(hueClient, [pendant], { on: false }, zigbeeConnectivity)).toEqual([
      { name: "Kitchen pendant", failed: "Hue Bridge is busy, try again" },
    ]);
  });

  it("changes a light named twice once", async () => {
    const { calls } = await update([pendant, pendant], { on: false });
    expect(calls).toHaveLength(1);
  });
});

describe("updateGroup", () => {
  const target = (group: Group): GroupTarget => ({
    name: group.metadata.name,
    groupedLightId: getGroupedLightId(group),
    lights: getLightsFromGroup(lights, group),
  });

  async function update(groupTarget: GroupTarget, change: Change, connectivity = zigbeeConnectivity) {
    const hueClient = fakeClient();
    const outcomes = await updateGroup(hueClient, groupTarget, change, connectivity);
    return {
      grouped: hueClient.updateGroupedLight.mock.calls,
      lights: hueClient.updateLight.mock.calls.map(([light, request]) => [light.metadata.name, request]),
      outcomes,
    };
  }

  it("turns a group off through its grouped light", async () => {
    expect(await update(target(office), { on: false })).toEqual({
      grouped: [[{ id: OFFICE_GROUPED_LIGHT }, { on: { on: false } }]],
      lights: [],
      outcomes: [{ name: "Office" }],
    });
  });

  it("leaves clipping a temperature to the bridge", async () => {
    const { grouped } = await update(target(office), { temperature: 2000 });
    expect(grouped).toEqual([[{ id: OFFICE_GROUPED_LIGHT }, { on: { on: true }, color_temperature: { mirek: 500 } }]]);
  });

  it.each<[Change, object]>([
    [{ brightnessChange: 15 }, { dimming_delta: { action: "up", brightness_delta: 15 } }],
    [{ temperatureChange: "cooler" }, { color_temperature_delta: { action: "down", mirek_delta: 35 } }],
  ])("sends %o as a delta, without on", async (change, request) => {
    const { grouped } = await update(target(office), change);
    expect(grouped).toEqual([[{ id: OFFICE_GROUPED_LIGHT }, request]]);
  });

  it("names the unreachable lights a grouped change can't leave out", async () => {
    const { grouped, outcomes } = await update(target(livingRoom), { brightness: 30 });
    expect(grouped).toHaveLength(1);
    expect(outcomes).toEqual([
      { name: "Living room" },
      ...LIVING_ROOM_UNREACHABLE.map((name) => ({ name, skipped: "unreachable" })),
    ]);
  });

  it("sends a color to each light with color", async () => {
    const red = { on: { on: true }, color: { xy: hexToXy("#ff0000").xy } };
    const { grouped, lights: changed, outcomes } = await update(target(livingRoom), { color: "red" }, []);
    expect(grouped).toEqual([]);
    expect(changed).toEqual(["Living room spot 3", "Living room spot 2", "Living room spot 1"].map((n) => [n, red]));
    expect(outcomes.filter(({ skipped }) => skipped === "no color")).toHaveLength(5);
  });

  it.each<Change>([{ on: true }, { color: "red" }])("skips a room without lights for %o", async (change) => {
    expect(await update({ name: "Hallway", lights: [] }, change)).toEqual({
      grouped: [],
      lights: [],
      outcomes: [{ name: "Hallway", skipped: "no lights" }],
    });
  });

  it("skips brightness for a group without dimmable lights", async () => {
    const { grouped, outcomes } = await update({ ...target(livingRoom), lights: [plug] }, { brightness: 30 });
    expect(grouped).toEqual([]);
    expect(outcomes).toEqual([{ name: "Living room", skipped: "no brightness" }]);
  });

  it("skips a delta for a group whose lights are all off", async () => {
    const off = { ...target(office), lights: target(office).lights.map((light) => ({ ...light, on: { on: false } })) };
    const { grouped, outcomes } = await update(off, { brightnessChange: 10 });
    expect(grouped).toEqual([]);
    expect(outcomes).toEqual([{ name: "Office", skipped: "off" }]);
  });

  it("reports the bridge's error", async () => {
    const hueClient = fakeClient();
    hueClient.updateGroupedLight.mockRejectedValue(new Error("Status 500 from Hue Bridge"));
    expect(await updateGroup(hueClient, target(office), { on: false }, zigbeeConnectivity)).toEqual([
      { name: "Office", failed: "Status 500 from Hue Bridge" },
    ]);
  });
});

describe("summarize", () => {
  it.each<[Change, Outcome[], string]>([
    [{ on: false }, [{ name: "Office" }], "Turned off Office."],
    [{ on: true }, [{ name: "A" }, { name: "B" }], "Turned on A and B."],
    [{ brightness: 30, color: "red" }, [{ name: "A" }], "Set A to 30% and red."],
    [{ brightnessChange: -20, temperatureChange: "cooler" }, [{ name: "A" }], "Made A 20% dimmer and cooler."],
    [
      { temperature: 2000 },
      [
        { name: "A", limit: 2203 },
        { name: "B", skipped: "no color" },
        { name: "C", skipped: "no color" },
        { name: "D", failed: "x" },
      ],
      "Set A to 2000K. Skipped B and C: no color. Failed D: x. A stopped at 2203K, its limit.",
    ],
  ])("describes %o", (change, outcomes, summary) => {
    expect(summarize(change, outcomes)).toBe(summary);
  });

  it("says nothing changed when everything was skipped", () => {
    expect(summarize({ on: true }, [{ name: "Hallway", skipped: "no lights" }])).toBe(
      "Nothing changed. Skipped Hallway: no lights.",
    );
  });

  it("throws when everything failed", () => {
    const outcomes = [
      { name: "A", failed: "x" },
      { name: "B", failed: "y" },
    ];
    expect(() => summarize({ on: true }, outcomes)).toThrow(/^Failed A: x\. Failed B: y\.$/);
  });
});
