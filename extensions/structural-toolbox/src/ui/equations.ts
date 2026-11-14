import { readableFont, palette } from "./visual-style";
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { environment } from "@raycast/api";
import { svgFile } from "./state";
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", {
  InputJax: new TeX({ packages: ["base", "ams"] }),
  OutputJax: new SVG({ fontCache: "none" }),
});
const cache = new Map<string, string>();
export function equationGraphic(tex: string, tight = false): string {
  const color = environment.appearance === "dark" ? "#e8eaf0" : "#252b35",
    key = color + readableFont() + tight + tex;
  if (cache.has(key)) return cache.get(key)!;
  const node = doc.convert(tex, {
    display: true,
    em: 22,
    ex: 11,
    containerWidth: 560,
  });
  const outer = adaptor.outerHTML(node);
  if (outer.includes('data-mml-node="merror"')) throw Error("Equation could not be typeset: " + tex);
  const start = outer.indexOf("<svg"),
    end = outer.lastIndexOf("</svg>") + 6;
  let inner = outer.slice(start, end);
  const box = inner
    .match(/viewBox="([^"]+)"/)?.[1]
    .split(/\s+/)
    .map(Number) || [0, 0, 1000, 1000];
  const factor = Math.min((readableFont() + 6) / 1000, 536 / box[2]),
    w = box[2] * factor,
    h = box[3] * factor;
  inner = inner
    .replace(/width="[^"]+"/, `width="${w}"`)
    .replace(/height="[^"]+"/, `height="${h}"`)
    .replace(/currentColor/g, color);
  const width = tight ? w + 24 : 560;
  const image = svgFile(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h + 18}" viewBox="0 0 ${width} ${h + 18}"><rect width="${width}" height="${h + 18}" fill="${palette().bg}"/><g transform="translate(12,9)">${inner}</g></svg>`,
  );
  if (cache.size > 256) cache.clear();
  cache.set(key, image);
  return image;
}
export function equation(tex: string): string {
  return `![Equation](${equationGraphic(tex)})`;
}
export function plainTex(value: string) {
  return `\\text{${value.replace(/[{}]/g, "").replace(/_/g, "\\_").replace(/%/g, "\\%").replace(/&/g, "\\&")}}`;
}
export function formulaTex(id: string, fallback: string) {
  const [base, output] = id.split("@");
  const map: Record<string, Record<string, string>> = {
    "ss-point": {
      moment: "M_{max}=\\frac{PL}{4}",
      shear: "V_{max}=\\frac{|P|}{2}",
      deflection: "\\delta_b=\\frac{PL^3}{48EI}",
      reactions: "R_A=R_B=\\frac{P}{2}",
    },
    "cant-point": {
      moment: "|M_A|=PL",
      shear: "V_{max}=|P|",
      deflection: "\\delta_b=\\frac{PL^3}{3EI}",
      reactions: "R_A=P",
    },
    "fixed-point": {
      moment: "M_A=M_B=-\\frac{PL}{8},\\quad M_{mid}=\\frac{PL}{8}",
      shear: "V_{max}=\\frac{|P|}{2}",
      deflection: "\\delta_b=\\frac{PL^3}{192EI}",
      reactions: "R_A=R_B=\\frac{P}{2}",
    },
    "ss-udl": {
      moment: "M_{max}=\\frac{qL^2}{8}",
      shear: "V_{max}=\\frac{qL}{2}",
      deflection: "\\delta_b=\\frac{5qL^4}{384EI}",
      reactions: "R_A=R_B=\\frac{qL}{2}",
    },
    "cant-udl": {
      moment: "|M_A|=\\frac{qL^2}{2}",
      shear: "V_{max}=qL",
      deflection: "\\delta_b=\\frac{qL^4}{8EI}",
      reactions: "R_A=qL",
    },
    "fixed-udl": {
      moment: "M_A=M_B=-\\frac{qL^2}{12},\\quad M_{mid}=\\frac{qL^2}{24}",
      shear: "V_{max}=\\frac{qL}{2}",
      deflection: "\\delta_b=\\frac{qL^4}{384EI}",
      reactions: "R_A=R_B=\\frac{qL}{2}",
    },
    "propped-udl": {
      moment: "M_A=-\\frac{qL^2}{8},\\quad M_+=\\frac{9qL^2}{128}",
      shear: "V_{max}=\\frac{5qL}{8}",
      reactions: "R_A=\\frac{5qL}{8},\\quad R_B=\\frac{3qL}{8}",
    },
    "ss-offcentre": {
      moment: "M_{max}=\\frac{Pab}{L},\\quad b=L-a",
      shear: "V_{max}=\\frac{|P|\\max(a,b)}{L}",
      reactions: "R_A=\\frac{Pb}{L},\\quad R_B=\\frac{Pa}{L}",
    },
    "cant-position": {
      moment: "|M_A|=Pa",
      shear: "V_{max}=|P|",
      deflection: "\\delta_{b,tip}=\\frac{Pa^2(3L-a)}{6EI}",
      reactions: "R_A=P",
    },
    "fixed-position": {
      moment: "M_A=-\\frac{Pab^2}{L^2},\\quad M_B=-\\frac{Pa^2b}{L^2}",
      reactions: "R_A=\\frac{Pb^2(3a+b)}{L^3},\\quad R_B=\\frac{Pa^2(a+3b)}{L^3}",
    },
    "continuous-udl": {
      moment: "M_B=-\\frac{qL^2}{8},\\quad M_+=\\frac{9qL^2}{128}",
      shear: "V_{max}=\\frac{5qL}{8}",
      reactions: "R_A=R_C=\\frac{3qL}{8},\\quad R_B=\\frac{5qL}{4}",
    },
    "continuous-point": {
      moment: "M_B=-\\frac{3PL}{32},\\quad M_+=\\frac{13PL}{64}",
      shear: "V_{max}=\\frac{19|P|}{32}",
      reactions: "R_A=\\frac{13P}{32},\\quad R_B=\\frac{11P}{16},\\quad R_C=-\\frac{3P}{32}",
    },
  };
  const simple: Record<string, string> = {
    "torsion-sv": String.raw`\theta'=\frac{T}{GJ},\quad\tau_{max}=\frac{|T|}{W_t}`,
    "torsion-warping": String.raw`T=GJ\theta'-EI_w\theta''',\quad B=-EI_w\theta''`,
    ltb: String.raw`M_{cr}=C_1\frac{\pi^2EI_z}{L_b^2}\sqrt{\frac{I_w}{I_z}+\frac{L_b^2GJ}{\pi^2EI_z}}`,
    properties: "A=\\int_A dA,\\quad I_y=\\int_A z^2\\,dA,\\quad W_y=\\frac{I_y}{z_{max}}",
    modulus: "W=\\frac{I}{c}",
    radius: "r=\\sqrt{\\frac{I}{A}}",
    "axial-stress": "\\sigma=\\frac{N}{A}",
    "bending-stress": "|\\sigma|=\\frac{|M|}{W}",
    "rect-shear": "\\tau_{max}=\\frac{3|V|}{2A}",
    "axial-deformation": "\\Delta L=\\frac{NL}{EA}",
    euler: "N_{cr}=\\frac{\\pi^2EI}{(KL)^2}",
  };
  return (
    simple[base] ||
    map[base]?.[output] ||
    (output === "deflection"
      ? "EI\\,v''(x)=M(x),\\quad v(x)\\text{ from support compatibility}"
      : output === "shear"
        ? "V(x)=\\frac{dM}{dx}"
        : plainTex(fallback))
  );
}
export const sectionNames: Record<string, string> = {
  "Ncr,y": "Euler load about y",
  "Ncr,z": "Euler load about z",
  "Ncr,u": "Euler load about principal u",
  "Ncr,v": "Euler load about principal v",
  Imajor: "Major principal second moment",
  Iminor: "Minor principal second moment",
  principalAngle: "Principal-axis angle",
  mass: "Mass per metre",
  Wy_published: "Published rounded section modulus y",
  Wz_published: "Published rounded section modulus z",
  E0_mean: "Mean modulus parallel to grain",
  E0_05: "5th-percentile modulus parallel to grain",
  E90_mean: "Mean modulus perpendicular to grain",
  G_mean: "Mean shear modulus",
  G_05: "5th-percentile shear modulus",
  rho_k: "Characteristic density",
  rho_mean: "Mean density",
  fm_k: "Characteristic bending strength",
  ft0_k: "Tension strength parallel to grain",
  ft90_k: "Tension strength perpendicular to grain",
  fc0_k: "Compression strength parallel to grain",
  fc90_k: "Compression strength perpendicular to grain",
  fv_k: "Characteristic shear strength",
  fck: "Characteristic cylinder compression strength",
  fck_cube: "Characteristic cube compression strength",
  fcm: "Mean compression strength",
  fctm: "Mean tensile strength",
  fctk_005: "5th-percentile tensile strength",
  fctk_095: "95th-percentile tensile strength",
  Ecm: "Mean secant modulus",
  nu: "Poisson ratio",
  A: "Area",
  Iy: "Second moment about y",
  Iz: "Second moment about z",
  Iyz: "Product of inertia",
  Wy: "Elastic section modulus y",
  Wz: "Elastic section modulus z",
  ry: "Gyration radius y",
  rz: "Gyration radius z",
  J: "Torsion constant",
  Ay: "Effective shear area y",
  Az: "Effective shear area z",
  cy: "Centroid y",
  cz: "Centroid z",
  h: "Height",
  b: "Width",
  d: "Diameter",
  t: "Wall thickness",
  tw: "Web thickness",
  tf: "Flange thickness",
  Wply: "Plastic section modulus y",
  Wplz: "Plastic section modulus z",
  Iw: "Warping constant",
  E: "Young’s modulus",
  G: "Shear modulus",
  density: "Density",
};
export function sectionEquations(shape: string) {
  const general = equation("A=\\int_A dA,\\quad I_y=\\int_A z^2dA,\\quad I_z=\\int_A y^2dA");
  const specific: Record<string, string> = {
    rectangle: "A=bh,\\quad I_y=\\frac{bh^3}{12},\\quad I_z=\\frac{hb^3}{12},\\quad W_y=\\frac{bh^2}{6}",
    circle: "A=\\frac{\\pi d^2}{4},\\quad I=\\frac{\\pi d^4}{64},\\quad W=\\frac{\\pi d^3}{32}",
    chs: "A=\\frac{\\pi(D^2-d_i^2)}4,\\quad I=\\frac{\\pi(D^4-d_i^4)}{64}",
    rhs: "I_y=\\frac{bh^3-(b-2t)(h-2t)^3}{12}",
    shs: "I=\\frac{h^4-(h-2t)^4}{12}",
  };
  return (
    general +
    "\n\n" +
    equation(specific[shape] || "I_y=\\sum_i (I_{y,i}+A_i d_{z,i}^2),\\quad W_y=\\frac{I_y}{z_{max}}") +
    "\n\nShape equations use idealized sharp-corner geometry; catalogue values include the manufacturer’s fillets and rounding."
  );
}
