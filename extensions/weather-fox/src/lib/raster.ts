// Pure-JS pixel compositing for the animated radar. Raycast extensions cannot
// ship native modules, so tiles are decoded (pngjs/jpeg-js), composited by
// hand, and encoded as a looping GIF (gifenc) that Raycast's markdown animates.

import { GIFEncoder, applyPalette, quantize } from "gifenc";
import * as jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { FetchedTile, GRID, TILE_PX } from "./tiles";

interface Bitmap {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

/** Tiles are 256px; a header claiming more is corrupt or hostile, and pngjs would allocate w*h*4 for it. */
const MAX_TILE_SIDE = 1024;

function decodeImage(buf: Buffer): Bitmap {
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    // IHDR is always the first chunk: width and height are big-endian at bytes 16 and 20.
    if (buf.length < 24 || buf.readUInt32BE(16) > MAX_TILE_SIDE || buf.readUInt32BE(20) > MAX_TILE_SIDE) {
      throw new Error("Tile image dimensions out of range");
    }
    const png = PNG.sync.read(buf);
    return { width: png.width, height: png.height, data: png.data };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    const img = jpeg.decode(buf, { useTArray: true, maxResolutionInMP: 2, maxMemoryUsageInMB: 32 });
    if (img.width > MAX_TILE_SIDE || img.height > MAX_TILE_SIDE) throw new Error("Tile image dimensions out of range");
    return img;
  }
  throw new Error("Unsupported tile image format");
}

/**
 * RainViewer's smoothed tiles encode intensity as alpha, and light rain comes
 * in at 25–35% (smaller cells even lower, since the smoothing spreads them
 * out). Drawn as-is over a grey basemap that is invisible, so faint alphas are
 * lifted with a gamma curve: 0.25 → 0.43, 0.5 → 0.66, 1 → 1.
 */
const RADAR_ALPHA_GAMMA = 0.6;

/** Nearest-neighbour scaled source-over blit with clipping. `alphaGamma` < 1 lifts translucent pixels. */
function blit(dst: Bitmap, src: Bitmap, dx: number, dy: number, outSize: number, alphaGamma = 1): void {
  const scale = src.width / outSize;
  const x0 = Math.max(0, dx);
  const y0 = Math.max(0, dy);
  const x1 = Math.min(dst.width, dx + outSize);
  const y1 = Math.min(dst.height, dy + outSize);
  for (let y = y0; y < y1; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y - dy) * scale));
    for (let x = x0; x < x1; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x - dx) * scale));
      const si = (sy * src.width + sx) * 4;
      const srcA = (src.data[si + 3] ?? 255) / 255;
      const a = alphaGamma === 1 ? srcA : Math.pow(srcA, alphaGamma);
      if (a <= 0.004) continue;
      const di = (y * dst.width + x) * 4;
      dst.data[di] = src.data[si] * a + dst.data[di] * (1 - a);
      dst.data[di + 1] = src.data[si + 1] * a + dst.data[di + 1] * (1 - a);
      dst.data[di + 2] = src.data[si + 2] * a + dst.data[di + 2] * (1 - a);
      dst.data[di + 3] = 255;
    }
  }
}

function fillCircle(
  dst: Bitmap,
  cx: number,
  cy: number,
  r: number,
  rgb: [number, number, number],
  alpha: number,
): void {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const x1 = Math.min(dst.width - 1, Math.ceil(cx + r + 1));
  const y1 = Math.min(dst.height - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      // 1px anti-aliased edge.
      const a = alpha * Math.max(0, Math.min(1, r + 0.5 - d));
      if (a <= 0.004) continue;
      const di = (y * dst.width + x) * 4;
      dst.data[di] = rgb[0] * a + dst.data[di] * (1 - a);
      dst.data[di + 1] = rgb[1] * a + dst.data[di + 1] * (1 - a);
      dst.data[di + 2] = rgb[2] * a + dst.data[di + 2] * (1 - a);
    }
  }
}

function fillRect(
  dst: Bitmap,
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: [number, number, number],
  alpha: number,
): void {
  const x1 = Math.min(dst.width, Math.round(x + w));
  const y1 = Math.min(dst.height, Math.round(y + h));
  for (let yy = Math.max(0, Math.round(y)); yy < y1; yy++) {
    for (let xx = Math.max(0, Math.round(x)); xx < x1; xx++) {
      const di = (yy * dst.width + xx) * 4;
      dst.data[di] = rgb[0] * alpha + dst.data[di] * (1 - alpha);
      dst.data[di + 1] = rgb[1] * alpha + dst.data[di + 1] * (1 - alpha);
      dst.data[di + 2] = rgb[2] * alpha + dst.data[di + 2] * (1 - alpha);
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export interface RadarGifOptions {
  baseTiles: FetchedTile[];
  /** Radar tile sets, oldest first; each set covers the same radar grid. */
  frames: FetchedTile[][];
  /** How many of `frames` are past observations (the rest are nowcast). */
  pastCount: number;
  /** Radar grid geometry in base-grid pixel space (see radarGridFor). */
  radarTilePx: number;
  radarOriginX: number;
  radarOriginY: number;
  /** Frame centre within the base grid, in pixels. */
  px: number;
  py: number;
  /** Location marker within the base grid, in pixels. */
  markerX?: number;
  markerY?: number;
  accent: string;
  width: number;
  height: number;
  /** Milliseconds per frame. */
  frameDelay?: number;
}

/** Composite base + radar tile frames into a looping animated GIF. */
export function buildRadarGif(opts: RadarGifOptions): Uint8Array {
  const { width, height } = opts;
  const gridPx = GRID * TILE_PX;
  const accent = hexToRgb(opts.accent);
  const decoded = new Map<Buffer, Bitmap>();
  const decode = (buf: Buffer) => {
    let bmp = decoded.get(buf);
    if (!bmp) decoded.set(buf, (bmp = decodeImage(buf)));
    return bmp;
  };

  const canvas: Bitmap = { width: gridPx, height: gridPx, data: new Uint8ClampedArray(gridPx * gridPx * 4) };
  fillRect(canvas, 0, 0, gridPx, gridPx, [36, 40, 48], 1);
  for (const t of opts.baseTiles) {
    if (t.buf) blit(canvas, decode(t.buf), t.col * TILE_PX, t.row * TILE_PX, TILE_PX);
  }

  const x0 = Math.round(opts.px - width / 2);
  const y0 = Math.round(opts.py - height / 2);
  const base: Bitmap = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  for (let y = 0; y < height; y++) {
    const row = ((y + y0) * gridPx + x0) * 4;
    base.data.set(canvas.data.subarray(row, row + width * 4), y * width * 4);
  }

  const gif = GIFEncoder();
  const delay = opts.frameDelay ?? 420;
  opts.frames.forEach((tiles, i) => {
    const frame: Bitmap = { width, height, data: base.data.slice() };
    for (const t of tiles) {
      if (!t.buf) continue;
      const dx = opts.radarOriginX + t.col * opts.radarTilePx - x0;
      const dy = opts.radarOriginY + t.row * opts.radarTilePx - y0;
      blit(frame, decode(t.buf), Math.round(dx), Math.round(dy), opts.radarTilePx, RADAR_ALPHA_GAMMA);
    }

    if (opts.markerX !== undefined && opts.markerY !== undefined) {
      const mx = opts.markerX - x0;
      const my = opts.markerY - y0;
      if (mx >= 14 && mx <= width - 14 && my >= 14 && my <= height - 14) {
        fillCircle(frame, mx, my, 20, accent, 0.35);
        fillCircle(frame, mx, my, 11, [255, 255, 255], 1);
        fillCircle(frame, mx, my, 7.5, accent, 1);
      }
    }

    // Timeline: progress fill, with a white notch where observations end and nowcast begins.
    const barX = 42;
    const barW = width - barX * 2;
    const barY = height - 20;
    fillRect(frame, barX, barY, barW, 6, [255, 255, 255], 0.25);
    fillRect(frame, barX, barY, (barW * (i + 1)) / opts.frames.length, 6, accent, 0.95);
    if (opts.pastCount < opts.frames.length) {
      fillRect(frame, barX + (barW * opts.pastCount) / opts.frames.length - 1, barY - 3, 3, 12, [255, 255, 255], 1);
    }

    const rgba = frame.data as Uint8ClampedArray;
    const palette = quantize(rgba, 256);
    gif.writeFrame(applyPalette(rgba, palette), width, height, {
      palette,
      delay: i === opts.frames.length - 1 ? 1200 : delay,
      repeat: 0,
    });
  });

  gif.finish();
  return gif.bytes();
}
