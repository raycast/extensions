import * as gifenc from "gifenc/dist/gifenc.js";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join } from "node:path";
import { Raster, paletteMapper, type RGB } from "./preview-raster.ts";
import { curveValue, springValue } from "./model.ts";
import type { PreviewSpec } from "./preview.ts";
import { PREVIEW_WIDTH, PREVIEW_HEIGHT } from "./preview-dimensions.ts";
const named = gifenc as Partial<typeof gifenc>;
const { GIFEncoder } = named.GIFEncoder ? gifenc : gifenc.default;
export const RETINA_WIDTH = PREVIEW_WIDTH * 2,
  RETINA_HEIGHT = PREVIEW_HEIGHT * 2;
type Label = { width: number; height: number; alpha: Uint8Array };
const fonts = new Map<string, Record<string, Label>>();
function loadLabels(directory: string) {
  let labels = fonts.get(directory);
  if (!labels) {
    const source = JSON.parse(
      readFileSync(join(directory, "preview-labels.json"), "utf8"),
    ) as Record<string, { width: number; height: number; alpha: string }>;
    labels = Object.fromEntries(
      Object.entries(source).map(([key, value]) => [
        key,
        { ...value, alpha: inflateSync(Buffer.from(value.alpha, "base64")) },
      ]),
    );
    fonts.set(directory, labels);
  }
  return labels;
}
const themes = {
  dark: {
    bg: [15, 17, 21],
    border: [57, 61, 70],
    surface: [43, 46, 54],
    surfaceTop: [55, 58, 67],
    text: [236, 237, 243],
    muted: [143, 148, 163],
    accent: [134, 115, 252],
    coral: [255, 117, 93],
    coralLight: [255, 161, 117],
    track: [34, 37, 45],
  },
  light: {
    bg: [247, 248, 251],
    border: [194, 199, 213],
    surface: [236, 238, 245],
    surfaceTop: [255, 255, 255],
    text: [40, 44, 58],
    muted: [99, 109, 132],
    accent: [105, 81, 224],
    coral: [229, 79, 49],
    coralLight: [250, 140, 89],
    track: [225, 229, 240],
  },
} satisfies Record<string, Record<string, RGB>>;
function mix(a: RGB, b: RGB, t: number): RGB {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t)) as unknown as RGB;
}
export function retinaPalette(appearance: PreviewSpec["appearance"]) {
  const theme = themes[appearance];
  const palette: number[][] = [];
  // Dense neutral ramp for text and fine borders, separate chromatic ramps.
  for (let i = 0; i < 128; i++)
    palette.push([...mix(theme.bg, theme.text, i / 127)]);
  for (const end of [theme.accent, theme.coral, theme.coralLight])
    for (let i = 0; i < 32; i++) palette.push([...mix(theme.bg, end, i / 31)]);
  // Explicit thumb ramp: background ramps alone collapsed 40 source colors to
  // four, producing horizontal bands in the actual GIF (not in the RGBA still).
  for (let i = 0; i < 32; i++)
    palette.push([...mix(theme.coralLight, theme.coral, i / 31)]);
  return palette;
}

export function renderRetinaFrame(
  spec: PreviewSpec,
  time: number,
  assetDirectory: string,
): Uint8Array {
  const p = themes[spec.appearance];
  const labels = loadLabels(assetDirectory);
  const r = new Raster(RETINA_WIDTH, RETINA_HEIGHT, p.bg);
  let offsetY = 0;
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    color: RGB,
    bottom = color,
  ) =>
    r.rect(x * 2, (y + offsetY) * 2, w * 2, h * 2, radius * 2, color, bottom);
  const text = (key: string, x: number, y: number, color = p.text) => {
    const label = labels[key];
    r.mask(
      x * 2,
      (y + offsetY) * 2,
      label.width,
      label.height,
      label.alpha,
      color,
    );
  };
  const line = (x: number, y: number, w: number, color = p.border) =>
    box(x, y, w, 0.5, 0, color);
  const progress = (delay = 0) => {
    const t = Math.max(0, Math.min(spec.duration, time - delay));
    return spec.easing.kind === "spring"
      ? springValue(spec.easing, t)
      : curveValue(
          spec.easing,
          spec.duration === 0 ? (time >= delay ? 1 : 0) : t / spec.duration,
        );
  };
  const value = progress();
  // Matte viewport; no blurry upscaled source and no additional decorative motion.
  box(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT, 8, p.border);
  box(0.5, 0.5, PREVIEW_WIDTH - 1, PREVIEW_HEIGHT - 1, 7.5, p.bg);
  // Recompose in the taller viewport, never scale glyphs or stretch geometry.
  if (spec.component === "Toggle" || spec.component === "Tooltip") offsetY = 32;
  if (spec.component === "Sheet") {
    // Quiet app context behind the sheet: enough structure to perceive travel.
    box(70, 5, 200, 166, 6, mix(p.bg, p.surface, 0.35));
    box(78, 12, 9, 9, 2, mix(p.bg, p.muted, 0.25));
    box(93, 14, 53, 3, 1.5, mix(p.bg, p.muted, 0.28));
    box(78, 30, 184, 53, 5, mix(p.bg, p.surface, 0.6));
    box(90, 39, 68, 3, 1.5, mix(p.bg, p.muted, 0.18));
    box(90, 48, 123, 2, 1, mix(p.bg, p.muted, 0.12));
    const y = 180 - sheetTravel(spec) * value;
    for (let layer = 7; layer > 0; layer--)
      box(
        78 - layer * 0.6,
        y + layer,
        184 + layer * 1.2,
        123,
        13,
        mix(p.bg, [0, 0, 0], 0.1),
      );
    box(78, y, 184, 125, 13, p.border);
    box(78.7, y + 0.7, 182.6, 124, 12.3, p.surfaceTop, p.surface);
    box(159, y + 7, 22, 2.5, 1.25, p.muted);
    text("heading", 91, y + 12);
    line(91, y + 34, 158);
    box(91, y + 41, 18, 18, 4, mix(p.accent, [255, 255, 255], 0.12), p.accent);
    box(97, y + 45, 6, 9, 1, [245, 247, 255]);
    box(97.7, y + 45.7, 4.6, 7.6, 0.5, p.accent);
    line(99, y + 49, 2, [245, 247, 255]);
    text("quick", 117, y + 35);
    text("capture", 117, y + 47, p.muted);
    line(117, y + 65, 132);
    box(91, y + 72, 18, 18, 4, mix(p.surface, p.border, 0.25));
    box(95, y + 77, 10, 8, 1, p.text);
    box(96, y + 78, 8, 6, 0.5, p.surface);
    box(95, y + 75, 4, 3, 0.7, p.text);
    text("folder", 117, y + 66);
    text("organize", 117, y + 78, p.muted);
    for (const row of [0, 31])
      for (let i = 0; i < 4; i++) {
        box(246 + i * 0.5, y + 47 + row + i * 0.5, 0.75, 0.75, 0.2, p.muted);
        box(246 + i * 0.5, y + 50 + row - i * 0.5, 0.75, 0.75, 0.2, p.muted);
      }
  } else if (spec.component === "Toggle") {
    for (const x of [75, 265]) box(x - 2, 54, 4, 4, 2, p.border);
    for (let x = 82; x < 109; x += 7) line(x, 56, 4);
    for (let x = 233; x < 259; x += 7) line(x, 56, 4);
    const x = 123 + 51 * value;
    // Subtle baked halo follows the thumb, rather than replacing its geometry.
    for (let layer = 10; layer > 0; layer--) {
      const radius = 22 + layer * 1.1;
      box(
        x + 21 - radius,
        56 - radius,
        radius * 2,
        radius * 2,
        radius,
        mix(p.bg, p.coral, 0.012 * (11 - layer)),
      );
    }
    box(116, 30, 111, 52, 26, p.border);
    box(116.7, 30.7, 109.6, 50.6, 25.3, p.track, p.surface);
    box(x - 1, 34, 45, 45, 22.5, mix(p.track, p.coral, 0.38));
    box(x, 34, 43, 43, 21.5, p.coralLight, p.coral);
    // Rounded highlight follows the sphere, not a flat bar on the thumb.
    box(x + 9, 38, 17, 0.6, 0.3, mix(p.coralLight, [255, 255, 255], 0.3));
  } else if (spec.component === "Tooltip") {
    box(154, 73, 32, 29, 7, p.border);
    box(154.7, 73.7, 30.6, 27.6, 6.3, p.surfaceTop, p.surface);
    box(164, 82, 8, 10, 1.2, p.muted);
    box(166, 84, 8, 10, 1.2, p.text);
    box(167, 85, 6, 8, 0.5, p.surface);
    const y = 48 - 22 * value;
    box(139, y + 3, 62, 29, 8, mix(p.bg, p.border, 0.5));
    box(166, y + 24, 8, 7, 2, p.text);
    box(139, y, 62, 28, 7, p.text);
    text("copy", 157, y + 4, p.bg);
  } else {
    const names = [
      "research",
      "ideas",
      "design",
      "prototype",
      "review",
      "handoff",
    ];
    for (let row = 0; row < 6; row++) {
      const x = 87 - 22 * progress(row * 0.06),
        y = 18 + row * 25;
      box(x, y, 210, 15, 4, mix(p.surface, p.border, 0.35));
      box(x + 0.5, y + 0.5, 209, 14, 3.5, p.surfaceTop, p.surface);
      box(x + 6, y + 4, 7, 7, 2, p.accent);
      text(names[row], x + 21, y - 5);
      box(x + 190, y + 6, 10, 2, 1, p.muted);
    }
  }
  return r.rgba;
}

const sheetTravels = new Map<string, number>();
export function sheetTravel(spec: PreviewSpec) {
  const key = JSON.stringify([spec.easing, spec.duration]);
  const cached = sheetTravels.get(key);
  if (cached !== undefined) return cached;
  const frames = Math.min(60, Math.max(2, Math.ceil(spec.duration / 0.02)));
  let peak = 1;
  // Fit the actual sampled motion, without clamping progress or scaling the UI.
  // Previously bounce 0.6 put the sheet 8px outside the top of its viewport.
  for (let i = 0; i < frames; i++) {
    const t = (i / (frames - 1)) * spec.duration;
    peak = Math.max(
      peak,
      spec.easing.kind === "spring"
        ? springValue(spec.easing, t)
        : curveValue(spec.easing, spec.duration === 0 ? 1 : t / spec.duration),
    );
  }
  const travel = Math.min(150, 176 / peak);
  if (sheetTravels.size >= 200)
    sheetTravels.delete(sheetTravels.keys().next().value!);
  sheetTravels.set(key, travel);
  return travel;
}

export function encodeRetinaPreview(
  spec: PreviewSpec,
  assetDirectory: string,
): Uint8Array {
  const palette = retinaPalette(spec.appearance);
  const map = paletteMapper(palette);
  const gif = GIFEncoder();
  const span = spec.duration + (spec.component === "Staggered List" ? 0.3 : 0);
  const frames = Math.min(60, Math.max(2, Math.ceil(span / 0.02)));
  for (let frame = -1; frame <= frames; frame++) {
    const time = Math.max(0, Math.min(1, frame / (frames - 1))) * span;
    const rgba = renderRetinaFrame(spec, time, assetDirectory);
    gif.writeFrame(map(rgba), RETINA_WIDTH, RETINA_HEIGHT, {
      palette,
      repeat: 0,
      delay:
        frame < 0
          ? 250
          : frame === frames
            ? 650
            : // Quantize cumulative boundaries, not each interval independently:
              // 1.529s / 60 used to become 60 × 30ms = 1.8s (271ms drift).
              Math.max(
                20,
                (Math.round(((frame + 1) * span * 100) / frames) -
                  Math.round((frame * span * 100) / frames)) *
                  10,
              ),
    });
  }
  gif.finish();
  return gif.bytes();
}
