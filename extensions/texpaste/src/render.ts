import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

// Packages that would swallow errors (render them in red) instead of reporting them.
const PACKAGES = AllPackages.filter((p) => p !== "noerrors" && p !== "noundefined");

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

type Doc = ReturnType<typeof mathjax.document>;
let doc: Doc | null = null;
let docMacros: string | null = null;

/** A fresh MathJax document per macro set, with macros defined once up front. */
function getDoc(macros: string): Doc {
  if (doc && docMacros === macros) return doc;
  const tex = new TeX({
    packages: PACKAGES,
    formatError: (_jax: unknown, err: Error) => {
      throw err;
    },
  });
  const svg = new SVG({ fontCache: "none" }); // inline every glyph path: no <use>, self-contained SVG
  const d = mathjax.document("", { InputJax: tex, OutputJax: svg });
  if (macros.trim()) {
    try {
      d.convert(macros, { display: true });
    } catch (e) {
      throw new Error(`Error in macros file: ${(e as Error).message}`);
    }
  }
  doc = d;
  docMacros = macros;
  return d;
}

export interface RenderOptions {
  color: string;
  fontSize: number; // in pt; 1em of the equation
  display: boolean;
  macros: string;
}

export interface RenderResult {
  svg: string;
  width: number; // pt
  height: number; // pt
}

/** Strip math delimiters people paste out of documents: $…$, $$…$$, \[…\], \(…\). */
export function cleanLatex(input: string): string {
  let s = input.trim();
  for (const re of [/^\$\$([\s\S]*)\$\$$/, /^\\\[([\s\S]*)\\\]$/, /^\$([\s\S]*)\$$/, /^\\\(([\s\S]*)\\\)$/]) {
    const m = re.exec(s);
    if (m) {
      s = m[1].trim();
      break;
    }
  }
  return s;
}

/** Render LaTeX to a standalone SVG sized in points. Throws with a TeX error message on bad input. */
export function renderSVG(latex: string, opts: RenderOptions): RenderResult {
  const d = getDoc(opts.macros);
  const node = d.convert(cleanLatex(latex), { display: opts.display, em: 16, ex: 8, containerWidth: 80 * 16 });
  let svg = adaptor.innerHTML(node);

  const vb = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(svg);
  if (!vb) throw new Error("Unexpected MathJax output");
  // viewBox units are 1/1000 em. Pad a little so glyphs touching MathJax's tight box aren't clipped.
  const PAD = 40;
  const [x, y, w, h] = vb.slice(1).map(parseFloat);
  const box = [x - PAD, y - PAD, w + 2 * PAD, h + 2 * PAD];
  const width = (box[2] / 1000) * opts.fontSize;
  const height = (box[3] / 1000) * opts.fontSize;

  svg = svg
    .replace(vb[0], `viewBox="${box.join(" ")}"`)
    .replace(/^<svg([^>]*?) style="[^"]*"/, "<svg$1")
    .replace(/^<svg([^>]*?) width="[^"]*"/, "<svg$1")
    .replace(/^<svg([^>]*?) height="[^"]*"/, "<svg$1")
    .replace(/^<svg/, `<svg width="${width.toFixed(3)}pt" height="${height.toFixed(3)}pt"`)
    .replace(/currentColor/g, opts.color);

  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, width, height };
}
