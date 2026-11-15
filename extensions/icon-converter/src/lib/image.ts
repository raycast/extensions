/** Raw 8-bit RGBA pixels: the common currency between every decoder and encoder. */
export interface RGBA {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

// The WASM codecs construct `ImageData`, which Node does not provide.
const g = globalThis as { ImageData?: unknown };
if (typeof g.ImageData === "undefined") {
  g.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

export function toRGBA(width: number, height: number, bytes: ArrayLike<number> & { buffer?: ArrayBufferLike }): RGBA {
  const data =
    bytes instanceof Uint8ClampedArray ? bytes : new Uint8ClampedArray(Uint8Array.from(bytes as ArrayLike<number>));
  return { width, height, data };
}

/** Composite onto an opaque colour (for formats without transparency). */
export function flatten(img: RGBA, [r, g, b]: [number, number, number]): RGBA {
  const src = img.data;
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3] / 255;
    out[i] = src[i] * a + r * (1 - a);
    out[i + 1] = src[i + 1] * a + g * (1 - a);
    out[i + 2] = src[i + 2] * a + b * (1 - a);
    out[i + 3] = 255;
  }
  return { width: img.width, height: img.height, data: out };
}

type Taps = { idx: Int32Array; w: Float32Array; n: number };

/** Per-output-pixel source taps: area average when shrinking, linear when enlarging. */
function taps(srcN: number, dstN: number): Taps {
  const ratio = srcN / dstN;
  const n = dstN < srcN ? Math.ceil(ratio) + 1 : 2;
  const idx = new Int32Array(dstN * n);
  const w = new Float32Array(dstN * n);
  for (let d = 0; d < dstN; d++) {
    if (dstN < srcN) {
      const start = d * ratio;
      const end = Math.min(srcN, (d + 1) * ratio);
      let k = 0;
      for (let s = Math.floor(start); s < end && k < n; s++, k++) {
        idx[d * n + k] = s;
        w[d * n + k] = (Math.min(end, s + 1) - Math.max(start, s)) / (end - start);
      }
    } else {
      const c = (d + 0.5) * ratio - 0.5;
      const i0 = Math.floor(c);
      const t = c - i0;
      idx[d * n] = Math.min(srcN - 1, Math.max(0, i0));
      idx[d * n + 1] = Math.min(srcN - 1, Math.max(0, i0 + 1));
      w[d * n] = 1 - t;
      w[d * n + 1] = t;
    }
  }
  return { idx, w, n };
}

/** Resample to exactly w x h (alpha-premultiplied, so transparent edges don't halo). */
export function resize(img: RGBA, w: number, h: number): RGBA {
  if (w === img.width && h === img.height) return img;
  const { width: sw, height: sh, data: src } = img;

  // Horizontal pass into premultiplied floats.
  const tx = taps(sw, w);
  const mid = new Float32Array(w * sh * 4);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let k = 0; k < tx.n; k++) {
        const wt = tx.w[x * tx.n + k];
        if (wt === 0) continue;
        const p = (y * sw + tx.idx[x * tx.n + k]) * 4;
        const pa = src[p + 3] * wt;
        r += src[p] * pa;
        g += src[p + 1] * pa;
        b += src[p + 2] * pa;
        a += pa;
      }
      const o = (y * w + x) * 4;
      mid[o] = r;
      mid[o + 1] = g;
      mid[o + 2] = b;
      mid[o + 3] = a;
    }
  }

  // Vertical pass, then un-premultiply.
  const ty = taps(sh, h);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let k = 0; k < ty.n; k++) {
        const wt = ty.w[y * ty.n + k];
        if (wt === 0) continue;
        const p = (ty.idx[y * ty.n + k] * w + x) * 4;
        r += mid[p] * wt;
        g += mid[p + 1] * wt;
        b += mid[p + 2] * wt;
        a += mid[p + 3] * wt;
      }
      const o = (y * w + x) * 4;
      if (a > 0) {
        out[o] = r / a;
        out[o + 1] = g / a;
        out[o + 2] = b / a;
        out[o + 3] = a;
      }
    }
  }
  return { width: w, height: h, data: out };
}

/** Shrink (never enlarge) so the longest side is at most `maxSide`. */
export function fitInside(img: RGBA, maxSide: number): RGBA {
  const longest = Math.max(img.width, img.height);
  if (longest <= maxSide) return img;
  const s = maxSide / longest;
  return resize(img, Math.max(1, Math.round(img.width * s)), Math.max(1, Math.round(img.height * s)));
}

/** Scale to fit a size x size square, centred on transparent padding. */
export function containSquare(img: RGBA, size: number): RGBA {
  const s = size / Math.max(img.width, img.height);
  const w = Math.max(1, Math.min(size, Math.round(img.width * s)));
  const h = Math.max(1, Math.min(size, Math.round(img.height * s)));
  const scaled = resize(img, w, h);
  if (w === size && h === size) return scaled;
  const out = new Uint8ClampedArray(size * size * 4);
  const ox = Math.floor((size - w) / 2);
  const oy = Math.floor((size - h) / 2);
  for (let y = 0; y < h; y++) {
    out.set(scaled.data.subarray(y * w * 4, (y + 1) * w * 4), ((y + oy) * size + ox) * 4);
  }
  return { width: size, height: size, data: out };
}

/** Apply an EXIF orientation (1-8) so pixels are stored upright. */
export function orient(img: RGBA, orientation: number): RGBA {
  if (orientation < 2 || orientation > 8) return img;
  const { width: w, height: h, data: src } = img;
  const swap = orientation >= 5;
  const ow = swap ? h : w;
  const oh = swap ? w : h;
  const out = new Uint8ClampedArray(src.length);
  const s32 = new Uint32Array(src.buffer, src.byteOffset, w * h);
  const o32 = new Uint32Array(out.buffer);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let dx: number, dy: number;
      switch (orientation) {
        case 2:
          dx = w - 1 - x;
          dy = y;
          break;
        case 3:
          dx = w - 1 - x;
          dy = h - 1 - y;
          break;
        case 4:
          dx = x;
          dy = h - 1 - y;
          break;
        case 5:
          dx = y;
          dy = x;
          break;
        case 6:
          dx = h - 1 - y;
          dy = x;
          break;
        case 7:
          dx = h - 1 - y;
          dy = w - 1 - x;
          break;
        default:
          dx = y;
          dy = w - 1 - x;
      }
      o32[dy * ow + dx] = s32[y * w + x];
    }
  }
  return { width: ow, height: oh, data: out };
}
