import { environment, Icon, type Image, type List } from "@raycast/api";
import { createPngCache } from "./png-cache";
import { paintDots, PERIOD_S } from "./dots-painter";

/** Bump when the drawing changes so cached files are regenerated. */
const CACHE_VERSION = "v1";
const CANVAS = 56; // 14 pt view at 4x
/** Frames per cycle: 200 ms each, the same step as Rex's per-dot stagger. */
export const DOTS_FRAMES = 6;
export const DOTS_PERIOD_MS = Math.round(PERIOD_S * 1000);

const cachedPng = createPngCache(environment.supportPath);

function paint(frame: number, appearance: "light" | "dark"): string | undefined {
  return cachedPng(`dots/${CACHE_VERSION}`, `${frame}-${appearance}`, () =>
    paintDots(frame, { size: CANVAS, appearance, frames: DOTS_FRAMES }),
  );
}

/** One frame of Rex's three-dot working indicator, with light and dark variants. */
export function dotsImage(frame: number): Image.ImageLike {
  const f = ((frame % DOTS_FRAMES) + DOTS_FRAMES) % DOTS_FRAMES;
  const light = paint(f, "light");
  const dark = paint(f, "dark");
  return light && dark ? { source: { light, dark } } : Icon.Ellipsis;
}

/** Row accessory for a pane that is working without a known progress, at the row's trailing edge like Rex's tab. */
export function workingAccessory(frame: number, style: "trailing-animated" | "trailing-static"): List.Item.Accessory {
  return { icon: dotsImage(style === "trailing-static" ? 0 : frame), tooltip: "Working" };
}
