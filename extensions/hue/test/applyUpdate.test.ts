import { describe, expect, it, vi } from "vitest";
import { applyUpdate } from "../src/helpers/raycast";
import { applyEvent } from "../src/helpers/collections";
import { RequestDroppedError } from "../src/lib/RateLimitedQueue";
import type { Hue } from "../src/hooks/useHue";
import type { DeepPartial, Id, Light } from "../src/lib/types";
import { toasts } from "./raycast-stub";
import { fakeHue } from "./fakeHue";
import { lights, scenes } from "./fixtures/resources";

const find = <T extends { id: string }>(items: T[], id: string) => items.find((item) => item.id === id)!;
const byName = (name: string) => lights.find((light) => light.metadata.name === name)!;
// In the Living room's Relax scene, the one active scene with this light.
const lamp = byName("Living room floor lamp 1");
const relax = scenes.find(
  (scene) => scene.status.active !== "inactive" && scene.actions.some(({ target }) => target.rid === lamp.id),
)!;

// Switches the lamp off unless options say otherwise.
const update = (hue: Hue, options: Partial<Parameters<typeof applyUpdate>[1]> = {}) =>
  applyUpdate(hue, {
    lights: new Map<Id, DeepPartial<Light>>([[lamp.id, { on: { on: false } }]]),
    request: async () => {},
    success: "Done",
    failure: "Failed",
    ...options,
  });

describe("applyUpdate", () => {
  it("without a client, sends nothing, changes nothing and shows a failure toast", async () => {
    const hue = fakeHue({ lights, scenes, hueClient: undefined });
    const request = vi.fn();
    await update(hue, { request });
    expect(request).not.toHaveBeenCalled();
    expect(hue.setLights).not.toHaveBeenCalled();
    expect(toasts).toEqual([expect.objectContaining({ event: "show", style: "FAILURE" })]);
  });

  it("does nothing when canExecute refuses", async () => {
    const hue = fakeHue({ lights, scenes });
    const request = vi.fn();
    await update(hue, { canExecute: () => false, request });
    expect(request).not.toHaveBeenCalled();
    expect(hue.setLights).not.toHaveBeenCalled();
    expect(hue.setScenes).not.toHaveBeenCalled();
    expect(toasts).toEqual([]);
  });

  it("changes the lights before the request, then shows a success toast", async () => {
    const hue = fakeHue({ lights, scenes });
    let during: Light | undefined;
    const request = vi.fn(async () => void (during = find(hue.lights, lamp.id)));
    await update(hue, { request });
    expect(request).toHaveBeenCalledWith(hue.hueClient);
    expect(during?.on).toEqual({ on: false });
    expect(toasts).toEqual([expect.objectContaining({ event: "show", style: "SUCCESS" })]);
  });

  it("on failure, restores only what it changed, keeps the event stream's changes and shows the error", async () => {
    const other = byName("Kitchen pendant");
    const hue = fakeHue({ lights, scenes });
    await update(hue, {
      request: async () => {
        hue.setLights((items) =>
          applyEvent(items, "update", [{ id: other.id, type: "light", dimming: { brightness: 12 } }]),
        );
        throw new Error("Status 500 from Hue Bridge");
      },
    });
    expect(find(hue.lights, lamp.id)).toBe(lamp);
    expect(find(hue.lights, other.id).dimming?.brightness).toBe(12);
    expect(hue.scenes).toEqual(scenes);
    expect(toasts).toEqual([
      expect.objectContaining({ event: "show", style: "FAILURE", message: "Status 500 from Hue Bridge" }),
    ]);
  });

  it("keeps the change, without a toast, when the queue drops the request for a newer one", async () => {
    const hue = fakeHue({ lights, scenes });
    await update(hue, { request: () => Promise.reject(new RequestDroppedError()) });
    expect(find(hue.lights, lamp.id).on).toEqual({ on: false });
    expect(toasts).toEqual([]);
  });

  it("writes no scenes when the change ends none, like dimming", async () => {
    const hue = fakeHue({ lights, scenes });
    await update(hue, { lights: new Map([[lamp.id, { dimming: { brightness: 12 } }]]) });
    expect(hue.setScenes).not.toHaveBeenCalled();
  });

  it("marks inactive the active scene of a light it switches", async () => {
    const hue = fakeHue({ lights, scenes });
    await update(hue);
    const changed = hue.scenes.filter((scene, index) => scene !== scenes[index]);
    expect(changed).toEqual([{ ...relax, status: { ...relax.status, active: "inactive" } }]);
  });

  it("gives a light without dimming, like a plug, no dimming", async () => {
    const plug = byName("Living room plug");
    const hue = fakeHue({ lights, scenes });
    await update(hue, { lights: new Map([[plug.id, { on: { on: false }, dimming: { brightness: 50 } }]]) });
    expect(find(hue.lights, plug.id)).not.toHaveProperty("dimming");
    expect(find(hue.lights, plug.id).on).toEqual({ on: false });
  });
});
