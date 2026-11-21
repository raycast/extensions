import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

let ready: Promise<void> | null = null;

export async function svgToPng(svg: string, assetsPath: string, scale = 2): Promise<Buffer> {
  ready ??= initWasm(readFileSync(join(assetsPath, "resvg.wasm"))).catch((err) => {
    ready = null;
    throw err;
  });
  await ready;

  const fonts = ["Inter-Regular.ttf", "Inter-SemiBold.ttf"].map(
    (f) => new Uint8Array(readFileSync(join(assetsPath, f))),
  );
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    font: { fontBuffers: fonts, loadSystemFonts: false, defaultFontFamily: "Inter" },
  });
  return Buffer.from(resvg.render().asPng());
}
