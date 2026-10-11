import { describe, expect, it, vi } from "vitest";
import { BRIDGE_CONFIG_KEY } from "../src/helpers/constants";
import { findGroup, findLight, findScene, type Resources, withHueClient } from "../src/helpers/tools";
import { storage } from "./raycast-stub";
import { startBridge } from "./fakeBridge";
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
