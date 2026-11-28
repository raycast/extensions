import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import "mathjax-full/js/input/tex/base/BaseConfiguration.js";
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", {
  InputJax: new TeX({ packages: ["base", "ams"] }),
  OutputJax: new SVG({ fontCache: "none" }),
});

const EX_PX = 9;

/** Typesets LaTeX to a standalone SVG string with pixel dimensions and a fixed text color. */
export function texToSvg(tex: string, color: string, scale = 1.35): string {
  const node = doc.convert(tex, { display: true, em: 16, ex: 8, containerWidth: 2000 });
  let svg = adaptor.innerHTML(node);
  if (/data-mjx-error|merror/.test(svg)) throw new Error("Invalid LaTeX");
  svg = svg.replace(
    /(width|height)="([\d.]+)ex"/g,
    (_m, attr, v) => `${attr}="${(parseFloat(v) * EX_PX * scale).toFixed(1)}"`,
  );
  svg = svg.replace(/style="[^"]*"/, "");
  svg = svg.replace(/currentColor/g, color);
  if (!svg.includes("xmlns=")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg;
}
