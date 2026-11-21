import { describe, expect, it } from "vitest";
import { applyEvent, updateItems } from "../src/helpers/collections";
import { lights, scenes } from "./fixtures/resources";
import type { DeepPartial, Light, Scene } from "../src/lib/types";

const [first, second, third] = lights;
const change = (id: string, properties: DeepPartial<Light>) => ({ id, type: "light" as const, ...properties });

describe("applyEvent", () => {
  it("adds a new resource at the end, whole", () => {
    expect(applyEvent([first, second], "add", [third])).toEqual([first, second, third]);
  });

  it("replaces a resource added again without duplicating it", () => {
    const renamed = { ...second, metadata: { ...second.metadata, name: "Renamed" } };
    expect(applyEvent([first, second, third], "add", [renamed])).toEqual([first, renamed, third]);
  });

  it("removes a deleted resource by its ID", () => {
    expect(applyEvent([first, second, third], "delete", [{ id: second.id, type: "light" }])).toEqual([first, third]);
  });

  it("ignores the deletion of an unknown resource", () => {
    expect(applyEvent([first, second], "delete", [{ id: "unknown", type: "light" }])).toEqual([first, second]);
  });

  it("merges an update into the resource, keeping what it leaves out", () => {
    const [updated] = applyEvent([first], "update", [change(first.id, { dimming: { brightness: 12 } })]);
    expect(updated.dimming).toEqual({ ...first.dimming, brightness: 12 });
    expect(updated.color_temperature).toEqual(first.color_temperature);
  });

  it("applies two changes to one resource in order", () => {
    const [updated] = applyEvent([first], "update", [
      change(first.id, { on: { on: true }, dimming: { brightness: 12 } }),
      change(first.id, { on: { on: false } }),
    ]);
    expect(updated.on).toEqual({ on: false });
    expect(updated.dimming?.brightness).toBe(12);
  });

  it("changes nothing on an error", () => {
    const items = [first, second];
    expect(applyEvent(items, "error", [change(first.id, { on: { on: !first.on.on } })])).toBe(items);
  });
});

describe("updateItems", () => {
  it("merges nested properties, keeping the ones a change leaves out", () => {
    const [updated] = updateItems([first], new Map([[first.id, { color_temperature: { mirek: 200 } }]]));
    expect(updated.color_temperature).toEqual({ ...first.color_temperature, mirek: 200 });
    expect(updated.color_temperature?.mirek_schema).toBe(first.color_temperature?.mirek_schema);
  });

  it("keeps the items it doesn't change as they are", () => {
    const updated = updateItems([first, second], new Map([[first.id, { on: { on: true } }]]));
    expect(updated[1]).toBe(second);
    expect(updated[0]).not.toBe(first);
  });

  it("replaces arrays whole", () => {
    const [scene] = scenes.filter((s) => s.actions.length > 1);
    const [action] = scene.actions;
    const [updated] = updateItems<Scene>([scene], new Map([[scene.id, { actions: [action] }]]));
    expect(updated.actions).toEqual([action]);
  });

  it("skips undefined properties and sets null ones", () => {
    const [updated] = updateItems(
      [first],
      new Map([[first.id, { on: undefined, color_temperature: { mirek: null, mirek_valid: false } }]]),
    );
    expect(updated.on).toBe(first.on);
    expect(updated.color_temperature).toEqual({ ...first.color_temperature, mirek: null, mirek_valid: false });
  });
});
