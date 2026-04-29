import { createHash } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

type MJ = {
  html: { convert: (latex: string, opts: { display: boolean }) => unknown };
  adaptor: {
    firstChild: (n: unknown) => unknown;
    outerHTML: (n: unknown) => string;
  };
};

let mj: MJ | null = null;

function loadMathJax(): MJ {
  if (!mj) {
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const tex = new TeX({ packages: AllPackages });
    const svg = new SVG({ fontCache: "none" });
    const html = mathjax.document("", { InputJax: tex, OutputJax: svg });
    mj = { html, adaptor } as unknown as MJ;
  }
  return mj;
}

const VERSION = "v2";
const COLOR = "#d0d0d0";
const PX_PER_EX_INLINE = 22;
const PX_PER_EX_DISPLAY = 28;

function svgToDataURI(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function colorize(svg: string): string {
  if (svg.includes('color="')) return svg;
  return svg.replace("<svg ", `<svg color="${COLOR}" `);
}

function scaleSvg(svg: string, display: boolean): string {
  const px = display ? PX_PER_EX_DISPLAY : PX_PER_EX_INLINE;
  return svg
    .replace(
      /(\bwidth=)"([\d.]+)ex"/,
      (_, k, n) => `${k}"${(parseFloat(n) * px).toFixed(2)}"`,
    )
    .replace(
      /(\bheight=)"([\d.]+)ex"/,
      (_, k, n) => `${k}"${(parseFloat(n) * px).toFixed(2)}"`,
    )
    .replace(/style="vertical-align:[^"]*"/, "");
}

export async function renderTeX(
  latex: string,
  display: boolean,
): Promise<string> {
  const key = createHash("sha1")
    .update(`${VERSION}|${COLOR}|${display ? "D" : "I"}|${latex}`)
    .digest("hex");
  const dir = join(environment.supportPath, "math-cache");
  await fs.mkdir(dir, { recursive: true });
  const path = join(dir, `${key}.svg`);

  try {
    return svgToDataURI(await fs.readFile(path, "utf8"));
  } catch {
    /* miss */
  }

  const { html, adaptor } = loadMathJax();
  const node = html.convert(latex, { display });
  const inner = adaptor.firstChild(node);
  const svg = scaleSvg(colorize(adaptor.outerHTML(inner)), display);
  await fs.writeFile(path, svg, "utf8");
  return svgToDataURI(svg);
}

export async function clearMathCache(): Promise<number> {
  const dir = join(environment.supportPath, "math-cache");
  try {
    const files = await fs.readdir(dir);
    await Promise.all(files.map((f) => fs.unlink(join(dir, f))));
    return files.length;
  } catch {
    return 0;
  }
}
