import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AssistiveMmlHandler } from "mathjax-full/js/a11y/assistive-mml.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

export const adaptor = liteAdaptor();
const handler = RegisterHTMLHandler(adaptor);

const tex = new TeX();
const svg = new SVG();
export const jax = mathjax.document("", { InputJax: tex, OutputJax: svg });

export { AssistiveMmlHandler, AllPackages, handler };
