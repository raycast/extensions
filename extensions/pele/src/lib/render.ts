import { readFile } from "node:fs/promises";
import path from "node:path";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { render } from "pele";
import { normalizeSource } from "./input";
import { prepareSvg } from "./svg";
import { createTextMeasurer, FONT_FAMILY, FONT_FILES, FONT_SIZE, MONO_FONT_FAMILY } from "./typography";

export type DiagramOptions = { theme: string; scale: number; transparent: boolean };
export type Diagram = Awaited<ReturnType<typeof renderDiagram>>;
const MAX_PNG_EDGE = 8192;
const MAX_PNG_PIXELS = 16_000_000;
let resources: Promise<{ fonts: Uint8Array[]; measurer: ReturnType<typeof createTextMeasurer> }> | undefined;

function loadResources(assetsPath: string) {
  resources ??= (async () => {
    const [wasm, ...fonts] = await Promise.all(
      ["resvg.wasm", ...FONT_FILES.map((file) => `fonts/${file}`)].map((file) => readFile(path.join(assetsPath, file))),
    );
    const measurer = createTextMeasurer(fonts);
    await initWasm(wasm);
    return { fonts, measurer };
  })().catch((error: unknown) => {
    resources = undefined;
    throw error;
  });
  return resources;
}

export async function renderDiagram(input: string, options: DiagramOptions, assetsPath: string) {
  const source = normalizeSource(input);
  if (![1, 2, 3, 4].includes(options.scale)) throw new Error("PNG scale must be 1, 2, 3, or 4.");
  const { fonts, measurer } = await loadResources(assetsPath);
  const rendered = render(source, {
    responsive: false,
    autoDirection: false,
    fontFamily: FONT_FAMILY,
    fontFamilyMono: MONO_FONT_FAMILY,
    fontSize: FONT_SIZE,
    measurer,
    padding: 24,
    links: false,
    images: false,
  });
  const { width, height } = rendered;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("The diagram has no drawable content.");
  }
  const svg = prepareSvg(rendered.svg, options.theme, options.transparent);
  const scale = Math.min(
    options.scale,
    MAX_PNG_EDGE / Math.max(width, height),
    Math.sqrt(MAX_PNG_PIXELS / (width * height)),
  );
  const renderer = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    font: {
      fontBuffers: fonts,
      defaultFontFamily: FONT_FAMILY,
      sansSerifFamily: FONT_FAMILY,
      monospaceFamily: MONO_FONT_FAMILY,
    },
  });
  try {
    const image = renderer.render();
    try {
      return {
        source,
        type: rendered.type,
        width,
        height,
        theme: options.theme,
        // Outlined text keeps exported SVGs independent of installed fonts.
        svg: renderer.toString(),
        png: Buffer.from(image.asPng()),
        pngWidth: image.width,
        pngHeight: image.height,
      };
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}
