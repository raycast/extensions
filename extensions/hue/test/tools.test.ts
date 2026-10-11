import { describe, expect, it } from "vitest";
import { BRIDGE_CONFIG_KEY } from "../src/helpers/constants";
import getLights from "../src/tools/get-lights";
import { storage } from "./raycast-stub";
import { startBridge } from "./fakeBridge";

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
