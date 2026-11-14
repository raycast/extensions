/** Width reserved for a right-docked DevTools panel (device at 100% scale). */
export const DEVTOOLS_DOCK = 620;

export type Bounds = { x1: number; y1: number; x2: number; y2: number };
export type Avail = { w: number; h: number; left: number; top: number };

/**
 * Ensure the window is large enough for viewport + docked DevTools.
 * Never shrinks or jumps to the display origin — Cycle was forcing a small
 * phone+dock frame on every phone step and yanking the window around.
 */
export function expandForDeviceMode(
  bounds: Bounds,
  avail: Avail,
  viewport: { w: number; h: number },
): Bounds & { changed: boolean } {
  const curW = bounds.x2 - bounds.x1;
  const curH = bounds.y2 - bounds.y1;
  const needW = viewport.w + DEVTOOLS_DOCK;
  const needH = viewport.h;

  const outerW = Math.min(avail.w, Math.max(curW, needW));
  const outerH = Math.min(avail.h, Math.max(curH, needH));

  let x1 = bounds.x1;
  let y1 = bounds.y1;
  if (x1 + outerW > avail.left + avail.w) x1 = avail.left + avail.w - outerW;
  if (y1 + outerH > avail.top + avail.h) y1 = avail.top + avail.h - outerH;
  x1 = Math.max(avail.left, x1);
  y1 = Math.max(avail.top, y1);

  const changed = outerW !== curW || outerH !== curH || x1 !== bounds.x1 || y1 !== bounds.y1;
  return { x1, y1, x2: x1 + outerW, y2: y1 + outerH, changed };
}
