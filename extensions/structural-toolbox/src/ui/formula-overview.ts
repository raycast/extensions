import { Formula, FormulaValues, Answer } from "../core/formulas";
import { Material, Section } from "../core/types";
import { FormulaStage } from "../core/formula-flow";
import { formulaExample } from "../core/formula-examples";
import { inputUnit, displayInput } from "../core/formula-input";
import { formulaDrawing, diagramFont } from "./drawings";
import { equationGraphic, formulaTex, sectionNames } from "./equations";
import { svgFile, fmt } from "./state";
import { DETAIL_WIDTH, palette, smallFont, svgLabel, wrappedLabel } from "./visual-style";
import { metricCards, parameterChips } from "./panels";
function pngInfo(uri: string) {
  const b = Buffer.from(uri.split(",")[1], "base64");
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
export function formulaOverview(
  f: Formula,
  section: Section,
  material: Material,
  v: FormulaValues,
  answers: Answer[],
  stage: FormulaStage,
  provided: Set<string>,
  problem = "",
  raw = false,
) {
  if (f.id === "euler" && answers.length === 2 && !problem)
    return eulerOverview(f, section, material, v, answers, provided, raw);
  const c = palette(),
    W = DETAIL_WIDTH,
    font = diagramFont(),
    small = smallFont(font);
  const box = (x: number, y: number, w: number, h: number, fill = c.bg) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${c.border}"/>`;
  const image = (uri: string, x: number, y: number, maxW: number, maxH: number) => {
    const p = pngInfo(uri),
      factor = Math.min(2 / 3, maxW / p.w, maxH / p.h);
    return `<image href="${uri}" x="${x + (maxW - p.w * factor) / 2}" y="${y + (maxH - p.h * factor) / 2}" width="${p.w * factor}" height="${p.h * factor}"/>`;
  };
  let body = "",
    top = 0;
  if (!answers.length || problem) {
    const help = wrappedLabel(0, small + 4, "Example: " + formulaExample(f), W, small, c.sub);
    body += help.body;
    top += help.height + 15;
  }
  const tex =
    f.id === "properties"
      ? section.shape === "rectangle"
        ? "I_y=\\frac{bh^3}{12}"
        : "I_y=\\int_A z^2\\,dA"
      : formulaTex(f.id, f.equation);
  const eq = equationGraphic(tex, true),
    eqSize = pngInfo(eq),
    stacked = eqSize.w / 1.5 > 240;
  const a = answers[0];
  const card = metricCards(
    [
      {
        title: a ? (f.id === "properties" ? "Area" : a.label) : problem ? "Check input" : "Next input",
        value: a ? fmt(a.value) + " " + a.unit : problem ? "Complete the value" : stage.title,
        note: a ? "From the inputs below" : "Type or select below",
        accent: true,
      },
    ],
    stacked ? W : 266,
    font,
    1,
  );
  const eqHeight = Math.max(140, eqSize.h / 1.5 + font + 34),
    height = stacked ? card.height + eqHeight : Math.max(card.height, eqHeight);
  body += `<g transform="translate(0,${top})">${card.body}</g>`;
  const ex = stacked ? 0 : 278,
    ey = stacked ? top + card.height : top,
    ew = stacked ? W : 282,
    eh = stacked ? eqHeight : height - 12;
  body +=
    box(ex, ey, ew, eh) +
    svgLabel(ex + 14, ey + font + 12, "Equation", small, c.sub) +
    image(eq, ex + 10, ey + font + 22, ew - 20, eh - font - 32);
  top += height + 12;
  const inputs: string[] = [];
  if (stage.needsMaterial && provided.has("material")) inputs.push(material.id.replace(/^Steel-/i, ""));
  for (const key of f.inputs) {
    if (key === "section" || !Number.isFinite(v[key] as number)) continue;
    if (!stage.ready && !provided.has(key) && key !== "K") continue;
    const name = key === "P" && f.id === "rect-shear" ? "V" : key === "a" && f.id === "modulus" ? "c" : key;
    inputs.push(name + " " + fmt(displayInput(f, key, v[key] as number)) + " " + inputUnit(f, key));
  }
  const chips = parameterChips(inputs, W, font);
  body += `<g transform="translate(0,${top})">${chips.body}</g>`;
  top += chips.height;
  const diagram = formulaDrawing(f, section, v, !answers.length || !!problem),
    d = pngInfo(diagram),
    caption = wrappedLabel(
      14,
      top + small + 12,
      f.id === "euler" && stage.ready && !v.eulerAboutSection
        ? "Entered I governs; the other axis is not inferred"
        : stage.ready && provided.has("section")
          ? "Selected section"
          : stage.ready
            ? "Entered properties govern the result"
            : "Illustration; choose the missing inputs",
      W - 28,
      small,
      c.sub,
    );
  const sketchHeight = (d.h / d.w) * (W - 20),
    panelH = caption.height + sketchHeight + 28;
  body += box(0, top, W, panelH) + caption.body + image(diagram, 10, top + caption.height + 14, W - 20, sketchHeight);
  top += panelH + 12;
  if (answers.length && f.id === "properties") {
    const metrics = ["Iy", "Iz", "Wy", "Wz", "ry", "rz"]
      .map((k) => answers.find((a) => a.label === k))
      .filter(Boolean)
      .map((a) => ({
        title: a!.label + " " + (sectionNames[a!.label] || ""),
        value: fmt(a!.value) + " " + a!.unit,
        valueSize: Math.max(22, font),
      }));
    const props = metricCards(metrics, W, font);
    body += `<g transform="translate(0,${top})">${props.body}</g>`;
    top += props.height;
  }
  const drawing = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${top}" viewBox="0 0 ${W} ${top}"><style>text{font-family:Arial,sans-serif}</style><rect width="${W}" height="${top}" fill="${c.bg}"/>${body}</svg>`;
  return raw ? drawing : svgFile(drawing);
}

function eulerOverview(
  f: Formula,
  s: Section,
  m: Material,
  v: FormulaValues,
  answers: Answer[],
  provided: Set<string>,
  raw: boolean,
) {
  const W = DETAIL_WIDTH,
    c = palette(),
    font = diagramFont(),
    small = smallFont(font),
    governing = Math.min(...answers.map((a) => a.value));
  let body = "",
    top = 0;
  const cards = metricCards(
    answers.map((a, index) => ({
      title: sectionNames[a.label] || a.label,
      value: fmt(a.value) + " " + a.unit,
      note:
        (Math.abs(a.value - governing) < 1e-8 * Math.max(1, governing) ? "Governing; " : "") +
        "K = " +
        fmt(index === 0 ? (v.Ky ?? v.K) : (v.Kz ?? v.K)),
      accent: Math.abs(a.value - governing) < 1e-8 * Math.max(1, governing),
    })),
    W,
    font,
  );
  body += cards.body;
  top += cards.height;
  const chips = parameterChips(
    [
      provided.has("material") ? m.id.replace(/^Steel-/, "") : "",
      "E " + fmt(v.E) + " MPa",
      "L " + fmt(v.L / 1000) + " m",
      v.Ky !== undefined || v.Kz !== undefined
        ? `Ky ${fmt(v.Ky ?? v.K)}; Kz ${fmt(v.Kz ?? v.K)}`
        : "Common K " + fmt(v.K),
    ].filter(Boolean),
    W,
    font,
  );
  body += `<g transform="translate(0,${top})">${chips.body}</g>`;
  top += chips.height;
  const eq = equationGraphic(String.raw`N_{cr,j}=\frac{\pi^2 E I_j}{(KL)^2}`, true),
    e = pngInfo(eq),
    ew = e.w / 1.5,
    eh = e.h / 1.5;
  body +=
    svgLabel(14, top + font + 7, "Euler equation", font, c.sub) +
    `<image href="${eq}" x="${(W - ew) / 2}" y="${top + font + 20}" width="${ew}" height="${eh}"/>`;
  top += font + eh + 32;
  const diagram = formulaDrawing(f, s, v),
    d = pngInfo(diagram),
    dh = (d.h / d.w) * W;
  body += `<image href="${diagram}" x="0" y="${top}" width="${W}" height="${dh}"/>`;
  top += dh + 10;
  const note = wrappedLabel(
    12,
    top + small + 4,
    answers[0].label === "Ncr,u"
      ? "Principal u/v flexural axes; effective-length factors are shown above."
      : "Buckling about section y/z; x is along the member. Effective-length factors are shown above.",
    W - 24,
    small,
    c.sub,
  );
  body += note.body;
  top += note.height + 14;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${top}"><style>text{font-family:Arial,sans-serif}</style><rect width="${W}" height="${top}" fill="${c.bg}"/>${body}</svg>`;
  return raw ? svg : svgFile(svg);
}
