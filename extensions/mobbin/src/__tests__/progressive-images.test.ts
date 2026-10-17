import { describe, expect, it, vi } from "vitest";
import {
  loadReferenceImagesSequentially,
  referenceKey,
} from "../lib/progressive-images";
import type { MobbinReference, ScreenReference } from "../lib/types";

function screen(id: string): ScreenReference {
  return {
    kind: "screen",
    id,
    title: `Screen ${id}`,
    appName: "Example",
    platform: "ios",
    source: "api",
    mobbinUrl: `https://mobbin.com/screens/${id}`,
    image: { url: `https://example.com/${id}.webp` },
  };
}

describe("progressive image loading", () => {
  it("loads exactly one image at a time and publishes each result", async () => {
    const references = [screen("one"), screen("two"), screen("three")];
    const releases: Array<() => void> = [];
    let active = 0;
    let maximumActive = 0;
    const loadImage = vi.fn(
      (reference: MobbinReference) =>
        new Promise<string>((resolve) => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          releases.push(() => {
            active -= 1;
            resolve(`/cache/${reference.id}.webp`);
          });
        }),
    );
    const onLoaded = vi.fn();
    const pending = loadReferenceImagesSequentially(references, {
      signal: new AbortController().signal,
      loadedKeys: new Set(),
      onLoaded,
      loadImage,
    });

    await vi.waitFor(() => expect(loadImage).toHaveBeenCalledTimes(1));
    releases[0]?.();
    await vi.waitFor(() => expect(loadImage).toHaveBeenCalledTimes(2));
    releases[1]?.();
    await vi.waitFor(() => expect(loadImage).toHaveBeenCalledTimes(3));
    releases[2]?.();
    await pending;

    expect(maximumActive).toBe(1);
    expect(onLoaded.mock.calls).toEqual([
      ["screen:one", "/cache/one.webp"],
      ["screen:two", "/cache/two.webp"],
      ["screen:three", "/cache/three.webp"],
    ]);
  });

  it("prioritizes the selected result and stops after cancellation", async () => {
    const references = [screen("one"), screen("two"), screen("three")];
    const controller = new AbortController();
    let release: (() => void) | undefined;
    const loadImage = vi.fn(
      (reference: MobbinReference) =>
        new Promise<string>((resolve) => {
          release = () => resolve(`/cache/${reference.id}.webp`);
        }),
    );
    const onLoaded = vi.fn();
    const pending = loadReferenceImagesSequentially(references, {
      signal: controller.signal,
      loadedKeys: new Set(),
      priorityKey: referenceKey(references[1]!),
      onLoaded,
      loadImage,
    });

    await vi.waitFor(() => expect(loadImage).toHaveBeenCalledTimes(1));
    expect(loadImage.mock.calls[0]?.[0]).toMatchObject({ id: "two" });
    controller.abort();
    release?.();
    await pending;

    expect(loadImage).toHaveBeenCalledTimes(1);
    expect(onLoaded).not.toHaveBeenCalled();
  });
});
