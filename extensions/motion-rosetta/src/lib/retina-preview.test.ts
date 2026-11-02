import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { Raster, paletteMapper } from "./preview-raster.ts";
import {
  encodeRetinaPreview,
  renderRetinaFrame,
  retinaPalette,
  sheetTravel,
} from "./retina-preview.ts";
import { COMPONENTS, previewDuration } from "./preview.ts";
import { fromDuration, springValue } from "./model.ts";
const easing = fromDuration(0.5, 0.6);
const assets = join(process.cwd(), "assets");

// Parse container blocks independently of gifenc. Do not count byte signatures
// inside compressed image payloads, where marker bytes can occur accidentally.
function gifFrames(bytes: Uint8Array) {
  let pos = 13;
  if (bytes[10] & 128) pos += 3 * (1 << ((bytes[10] & 7) + 1));
  const delays: number[] = [];
  let frames = 0;
  const skipBlocks = () => {
    while (bytes[pos]) {
      pos += 1 + bytes[pos];
    }
    pos++;
  };
  while (pos < bytes.length) {
    const marker = bytes[pos++];
    if (marker === 0x3b) return { frames, delays };
    if (marker === 0x21) {
      const label = bytes[pos++];
      if (label === 0xf9) delays.push(bytes[pos + 2] | (bytes[pos + 3] << 8));
      skipBlocks();
    } else if (marker === 0x2c) {
      frames++;
      const packed = bytes[pos + 8];
      pos += 9;
      if (packed & 128) pos += 3 * (1 << ((packed & 7) + 1));
      pos++; // LZW minimum code size.
      skipBlocks();
    } else throw new Error(`Unexpected GIF marker ${marker} at ${pos - 1}`);
  }
  throw new Error("Missing GIF trailer");
}

describe("Retina preview", () => {
  it("keeps spring overshoot inside the top without clamping the spring", () => {
    for (const bounce of [0, 0.15, 0.4, 0.6, 0.9]) {
      const spring = fromDuration(0.5, bounce);
      const duration = previewDuration(spring);
      const travel = sheetTravel({
        easing: spring,
        duration,
        component: "Sheet",
        appearance: "dark",
      });
      const frames = Math.min(60, Math.max(2, Math.ceil(duration / 0.02)));
      for (let frame = 0; frame < frames; frame++) {
        const progress = springValue(spring, (frame / (frames - 1)) * duration);
        expect(180 - travel * progress).toBeGreaterThanOrEqual(4 - 1e-8);
      }
      expect(travel).toBeLessThanOrEqual(150);
      if (bounce === 0.6) expect(travel).toBeLessThan(150);
    }
  });
  it("preserves intermediate thumb colors after GIF palette mapping", () => {
    const rgba = new Uint8Array(40 * 4);
    const top = [255, 161, 117],
      bottom = [255, 117, 93];
    for (let i = 0; i < 40; i++)
      rgba.set(
        [...top.map((v, c) => Math.round(v + ((bottom[c] - v) * i) / 39)), 255],
        i * 4,
      );
    const palette = retinaPalette("dark");
    expect(palette).toHaveLength(256);
    expect(new Set(paletteMapper(palette)(rgba)).size).toBeGreaterThanOrEqual(
      12,
    );
  });
  it.each(["dark", "light"] as const)(
    "preserves 680×352, 62 frames and hold timings in %s",
    (appearance) => {
      for (const component of COMPONENTS) {
        const gif = Buffer.from(
          encodeRetinaPreview(
            {
              easing,
              duration: previewDuration(easing),
              component,
              appearance,
            },
            assets,
          ),
        );
        expect(gif.subarray(0, 6).toString()).toBe("GIF89a");
        expect([gif.readUInt16LE(6), gif.readUInt16LE(8)]).toEqual([680, 352]);
        const parsed = gifFrames(gif);
        expect(parsed.frames).toBe(62);
        expect(parsed.delays).toHaveLength(62);
        expect(parsed.delays[0]).toBe(25);
        expect(parsed.delays.at(-1)).toBe(65);
        const motionMs = parsed.delays
          .slice(1, -1)
          .reduce((sum, delay) => sum + delay * 10, 0);
        const targetMs =
          (previewDuration(easing) +
            (component === "Staggered List" ? 0.3 : 0)) *
          1000;
        expect(Math.abs(motionMs - targetMs)).toBeLessThanOrEqual(5);
        expect(gif.includes(Buffer.from("NETSCAPE2.0"))).toBe(true);
      }
    },
  );
  it("renders deterministic, distinct motion states without changing alpha", () => {
    const spec = {
      easing,
      duration: previewDuration(easing),
      component: "Sheet" as const,
      appearance: "dark" as const,
    };
    const start = renderRetinaFrame(spec, 0, assets),
      end = renderRetinaFrame(spec, spec.duration, assets);
    expect(start).not.toEqual(end);
    expect(end).toEqual(renderRetinaFrame(spec, spec.duration, assets));
    expect(
      end.every((channel, index) => index % 4 !== 3 || channel === 255),
    ).toBe(true);
  });
  it("clips rounded shapes without writing beyond the viewport", () => {
    const raster = new Raster(10, 10, [0, 0, 0]);
    raster.rect(-20, -20, 50, 50, 5, [255, 255, 255]);
    expect(raster.rgba.every((channel) => channel === 255)).toBe(true);
    const before = raster.rgba.slice();
    raster.rect(20, 20, 10, 10, 5, [0, 0, 0]);
    expect(raster.rgba).toEqual(before);
  });
  it("reuses palette decisions across frames without temporal color drift", () => {
    const map = paletteMapper([
      [0, 0, 0],
      [255, 255, 255],
      [255, 100, 80],
    ]);
    const rgba = new Uint8Array([
      0, 0, 0, 255, 255, 255, 255, 255, 255, 100, 80, 255,
    ]);
    expect([...map(rgba)]).toEqual([0, 1, 2]);
    expect(map(rgba)).toEqual(map(rgba));
  });
});
