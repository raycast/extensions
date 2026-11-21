import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
let ready: Promise<void> | undefined;
let font: Uint8Array;
export function initializeRenderer(assetsPath: string): Promise<void> {
  if (!ready) {
    font = readFileSync(join(assetsPath, "renderer", "Roboto.ttf"));
    ready = initWasm(readFileSync(join(assetsPath, "renderer", "resvg.wasm")));
  }
  return ready;
}
export function pngFromSVG(svg: string, targetWidth?: number): Buffer {
  if (!font) throw Error("Diagram renderer is not initialized");
  const render = new Resvg(svg.replace(/font-family:Arial,sans-serif/g, "font-family:Roboto,sans-serif"), {
    font: {
      fontBuffers: [font],
      defaultFontFamily: "Roboto",
      sansSerifFamily: "Roboto",
    },
    fitTo: targetWidth ? { mode: "width", value: targetWidth } : { mode: "zoom", value: 1.5 },
  });
  const image = render.render();
  try {
    return Buffer.from(image.asPng());
  } finally {
    image.free();
    render.free();
  }
}
