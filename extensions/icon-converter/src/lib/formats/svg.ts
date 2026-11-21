import { existsSync, readFileSync } from "node:fs";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { loadWasm } from "../assets";
import { toRGBA } from "../image";
import type { InputFormat } from "../types";

let ready: Promise<void> | undefined;

// resvg's WASM build cannot see installed fonts, so hand it a few common ones
// when (and only when) the SVG actually contains text.
const FONT_CANDIDATES = [
  "/System/Library/Fonts/Helvetica.ttc",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
  "/System/Library/Fonts/Supplemental/Courier New.ttf",
  "C:\\Windows\\Fonts\\arial.ttf",
  "C:\\Windows\\Fonts\\times.ttf",
  "C:\\Windows\\Fonts\\cour.ttf",
];
let fonts: Uint8Array[] | undefined;

function systemFonts(): Uint8Array[] {
  if (!fonts) {
    fonts = [];
    for (const file of FONT_CANDIDATES) {
      try {
        if (existsSync(file)) fonts.push(readFileSync(file));
      } catch {
        // unreadable font: skip it
      }
    }
  }
  return fonts;
}

export const fromSvg: InputFormat = {
  id: "svg",
  label: "SVG",
  extensions: ["svg"],
  vector: true,
  async open(bytes, options) {
    ready ??= loadWasm("resvg.wasm").then((wasm) => initWasm(wasm));
    await ready;

    const text = Buffer.from(bytes).toString("utf8");
    const font = /<text[\s>]/i.test(text)
      ? { fontBuffers: systemFonts(), defaultFontFamily: "Helvetica", sansSerifFamily: "Helvetica" }
      : undefined;

    const probe = new Resvg(text, { font });
    const width = probe.width;
    const height = probe.height;
    probe.free();
    if (!(width > 0 && height > 0)) throw new Error("SVG has no drawable size");

    return {
      svg: { text, width, height },
      async raster(maxSide) {
        // Explicit size requested by the target (e.g. each ICO size) wins,
        // then the user's width, then the SVG's intrinsic size.
        let fitTo: { mode: "width" | "height"; value: number } | { mode: "original" } = { mode: "original" };
        if (maxSide) fitTo = { mode: width >= height ? "width" : "height", value: maxSide };
        else if (options.width) fitTo = { mode: "width", value: options.width };

        const resvg = new Resvg(text, { font, fitTo });
        const rendered = resvg.render();
        const img = toRGBA(rendered.width, rendered.height, new Uint8ClampedArray(rendered.pixels));
        rendered.free();
        resvg.free();
        return img;
      },
    };
  },
};
