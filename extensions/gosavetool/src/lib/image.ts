// Image decode, resize and encode with the Squoosh WebAssembly codecs (libwebp, MozJPEG, OxiPNG).
// No native modules, so it runs the same on macOS and Windows. Nothing leaves the computer.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import webpDecode, { init as initWebpDec } from "@jsquash/webp/decode";
import webpEncode, { init as initWebpEnc } from "@jsquash/webp/encode";
import jpegDecode, { init as initJpegDec } from "@jsquash/jpeg/decode";
import jpegEncode, { init as initJpegEnc } from "@jsquash/jpeg/encode";
import pngDecode, { init as initPngDec } from "@jsquash/png/decode";
import oxipng, { init as initOxipng } from "@jsquash/oxipng/optimise";

export type Format = "webp" | "jpg" | "png";

// Node has no ImageData; the codecs only need the shape and the instanceof check
class NodeImageData {
  readonly colorSpace = "srgb";
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number,
  ) {}
}
const g = globalThis as Record<string, unknown>;
if (!g.ImageData) g.ImageData = NodeImageData;

let ready: Promise<void> | undefined;

// The Emscripten init() functions take (module, options) at runtime; their typings only list options
type EmInit = (module: WebAssembly.Module, options: { locateFile: (f: string) => string }) => Promise<unknown>;

function init(wasmDir: string) {
  const mod = (f: string) => new WebAssembly.Module(readFileSync(join(wasmDir, f)));
  // locateFile stops Emscripten from building a URL out of import.meta.url, which the CommonJS bundle lacks
  const opts = { locateFile: (f: string) => f };
  ready ??= (async () => {
    await (initWebpDec as unknown as EmInit)(mod("webp_dec.wasm"), opts);
    await (initWebpEnc as unknown as EmInit)(mod("webp_enc_simd.wasm"), opts);
    await (initJpegDec as unknown as EmInit)(mod("mozjpeg_dec.wasm"), opts);
    await (initJpegEnc as unknown as EmInit)(mod("mozjpeg_enc.wasm"), opts);
    await initPngDec(mod("squoosh_png_bg.wasm"));
    await initOxipng(mod("squoosh_oxipng_bg.wasm"));
  })();
  return ready;
}

export function sniff(buf: Uint8Array): Format | undefined {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (String.fromCharCode(...buf.subarray(0, 4)) === "RIFF" && String.fromCharCode(...buf.subarray(8, 12)) === "WEBP")
    return "webp";
  return undefined;
}

const ab = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

async function decode(buf: Uint8Array, fmt: Format): Promise<ImageData> {
  if (fmt === "webp") return webpDecode(ab(buf));
  if (fmt === "jpg") return jpegDecode(ab(buf));
  return pngDecode(ab(buf));
}

/** Box-filter downscale: each output pixel is the alpha-weighted average of the source pixels it covers */
function shrink(img: ImageData, w: number): ImageData {
  const sw = img.width,
    sh = img.height;
  if (w >= sw) return img;
  const h = Math.max(1, Math.round((sh * w) / sw));
  const out = new Uint8ClampedArray(w * h * 4),
    src = img.data,
    fx = sw / w,
    fy = sh / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * fy),
      y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * fx),
        x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
      let r = 0,
        gg = 0,
        b = 0,
        a = 0,
        n = 0;
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * sw + xx) * 4,
            al = src[i + 3];
          r += src[i] * al;
          gg += src[i + 1] * al;
          b += src[i + 2] * al;
          a += al;
          n++;
        }
      const o = (y * w + x) * 4;
      if (a) {
        out[o] = r / a;
        out[o + 1] = gg / a;
        out[o + 2] = b / a;
      }
      out[o + 3] = a / n;
    }
  }
  return new ImageData(out, w, h);
}

/** JPG has no transparency: blend onto white like the browser extension does */
function flatten(img: ImageData): ImageData {
  const d = new Uint8ClampedArray(img.data);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    d[i] = d[i] * a + 255 * (1 - a);
    d[i + 1] = d[i + 1] * a + 255 * (1 - a);
    d[i + 2] = d[i + 2] * a + 255 * (1 - a);
    d[i + 3] = 255;
  }
  return new ImageData(d, img.width, img.height);
}

export interface Result {
  data: Uint8Array;
  width: number;
  height: number;
  from: Format;
}

/** quality 1–100 (ignored for PNG, which is lossless); maxWidth 0 keeps the size */
export async function convert(
  wasmDir: string,
  input: Uint8Array,
  to: Format,
  quality: number,
  maxWidth = 0,
): Promise<Result> {
  await init(wasmDir);
  const from = sniff(input);
  if (!from) throw new Error("Only PNG, JPG and WebP files can be read");
  let img = await decode(input, from);
  if (maxWidth > 0) img = shrink(img, maxWidth);
  let out: ArrayBuffer;
  if (to === "webp") out = await webpEncode(img, { quality });
  else if (to === "jpg") out = await jpegEncode(flatten(img), { quality });
  else out = await oxipng(img, { level: 1 });
  return { data: new Uint8Array(out), width: img.width, height: img.height, from };
}

export const EXT: Record<Format, string> = { webp: "webp", jpg: "jpg", png: "png" };

export function kb(n: number): string {
  return n >= 1048576 ? (n / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
}
