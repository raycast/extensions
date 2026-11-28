import { engineeringSketch } from "./stability-torsion";
import { engineeringIDs } from "../core/engineering-input";
import { metricCards, parameterChips, MetricCard } from "./panels";
import { DETAIL_WIDTH, readableFont, smallFont, palette, svgLabel, wrappedLabel, wrapLabel } from "./visual-style";
import { beamScene } from "./beam-scene";
import { responseCharts } from "./response-charts";
import { rotationVector } from "../core/diagram-vectors";
import { environment } from "@raycast/api";
import { memberName, activeResponse, ResponseKey } from "../core/presentation";
import { Model, Result, Section } from "../core/types";
import { sectionStresses } from "../core/stresses";
import { Formula, FormulaValues } from "../core/formulas";
import { buildModel } from "../core/templates";
import { analyze } from "../core/engine";
import { svgFile, fmt, preferences } from "./state";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
const theme = palette;
export const diagramFont = readableFont;
const sectionPanelHeight = (s?: Section) => 200 + (s?.t ? 28 : s?.tw || s?.tf ? 56 : 0);
function svg(w: number, h: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>text{font-family:Arial,sans-serif;font-size:${diagramFont()}px;fill:${theme().ink}}</style>${body}</svg>`;
}
function line(x: number, y: number, X: number, Y: number, c = theme().line, width = 1) {
  return `<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${width}"/>`;
}
function text(x: number, y: number, value: string, anchor = "middle") {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}">${esc(value)}</text>`;
}
export function sectionDrawing(s: Section, raw = false) {
  const c = theme(),
    scale = 180 / Math.max(s.h, s.b),
    x = 260 - (s.b * scale) / 2,
    y = 125 - (s.h * scale) / 2;
  const rect = (X: number, Y: number, w: number, h: number) =>
    `<rect x="${X}" y="${Y}" width="${w}" height="${h}" fill="${c.blue}" fill-opacity=".16" stroke="${c.ink}"/>`;
  let body = "";
  if (s.shape === "circle" || s.shape === "chs") {
    body = `<circle cx="260" cy="125" r="90" fill="${c.blue}" fill-opacity=".16" stroke="${c.ink}"/>`;
    if (s.shape === "chs")
      body += `<circle cx="260" cy="125" r="${90 - s.t * scale}" fill="${c.bg}" stroke="${c.ink}"/>`;
  } else if (["rectangle", "rhs", "shs"].includes(s.shape)) {
    body = rect(x, y, s.b * scale, s.h * scale);
    if (s.shape !== "rectangle")
      body += `<rect x="${x + s.t * scale}" y="${y + s.t * scale}" width="${(s.b - 2 * s.t) * scale}" height="${(s.h - 2 * s.t) * scale}" fill="${c.bg}" stroke="${c.ink}"/>`;
  } else {
    const b = s.b * scale,
      h = s.h * scale,
      tw = s.tw * scale,
      tf = s.tf * scale;
    if (s.shape === "i")
      body = rect(x, y, b, tf) + rect(x + (b - tw) / 2, y + tf, tw, h - 2 * tf) + rect(x, y + h - tf, b, tf);
    if (s.shape === "t") body = rect(x, y, b, tf) + rect(x + (b - tw) / 2, y + tf, tw, h - tf);
    if (s.shape === "channel") body = rect(x, y, b, tf) + rect(x, y + tf, tw, h - 2 * tf) + rect(x, y + h - tf, b, tf);
    if (s.shape === "angle") body = rect(x, y + s.h * scale - tf, b, tf) + rect(x, y, tw, h - tf);
  }
  body +=
    line(155, y + (s.h - s.cz) * scale, 365, y + (s.h - s.cz) * scale, c.line) +
    text(386, y + (s.h - s.cz) * scale + 4, "y");
  body += line(x + s.cy * scale, 25, x + s.cy * scale, 225, c.line) + text(x + s.cy * scale, 18, "z");
  body += ["circle", "chs"].includes(s.shape)
    ? text(260, 270, `d = ${fmt(s.h)} mm`)
    : text(175, 270, `b = ${fmt(s.b)} mm`) + text(365, 270, `h = ${fmt(s.h)} mm`);
  return raw ? svg(520, 290, body) : svgFile(svg(520, 290, body));
}

/** Independent scales keep the cross-section legible beside a metre-scale system. */
function sectionPanel(s: Section) {
  const original = sectionDrawing(s, true),
    geometry = original
      .slice(original.indexOf("</style>") + 8)
      .replace(/<text\b[^>]*>.*?<\/text>/g, "")
      .replace(/<\/svg>$/, "");
  let body =
    svgLabel(62, 26, "Section", smallFont(), theme().sub, 400, "middle") +
    `<g transform="translate(62,87) scale(${80 / 180}) translate(-260,-125)">${geometry}</g>`;
  const round = ["circle", "chs"].includes(s.shape);
  body += svgLabel(62, 153, round ? "Ø " + fmt(s.h) : "b " + fmt(s.b), smallFont(), theme().ink, 400, "middle");
  body += svgLabel(62, 180, round ? "mm" : "h " + fmt(s.h) + " mm", smallFont(), theme().sub, 400, "middle");
  if (s.t) body += svgLabel(62, 209, "t " + fmt(s.t) + " mm", smallFont(), theme().sub, 400, "middle");
  else if (s.tw || s.tf)
    body +=
      svgLabel(62, 209, "web " + fmt(s.tw), smallFont(), theme().sub, 400, "middle") +
      svgLabel(62, 237, "flange " + fmt(s.tf), smallFont(), theme().sub, 400, "middle");
  return body;
}
export function systemDrawing(model: Model, section?: Section, showLoads = true, result?: Result) {
  const scene = beamScene(model, result, {
    width: DETAIL_WIDTH,
    left: section ? 165 : 48,
    right: 512,
    font: diagramFont(),
    ...theme(),
    showLoads,
    showReactions: !!result,
  });
  const height = Math.max(scene.height, sectionPanelHeight(section));
  const body = (section ? sectionPanel(section) + line(128, 15, 128, height - 12) : "") + scene.body;
  return svgFile(svg(DETAIL_WIDTH, height, body));
}
export function modelDrawing(model: Model, showLoads = true, reactions?: Result, raw = false) {
  const scene = beamScene(model, reactions, {
    width: 560,
    left: 48,
    right: 512,
    font: diagramFont(),
    ...theme(),
    showLoads,
    showReactions: !!reactions,
  });
  return raw ? svg(560, scene.height, scene.body) : svgFile(svg(560, scene.height, scene.body));
}
export function resultDiagrams(
  model: Model,
  result: Result,
  only?: ResponseKey,
  compact = false,
  raw = false,
  symbolic = false,
) {
  const chart = responseCharts(
    model,
    result,
    {
      width: DETAIL_WIDTH,
      left: 165,
      right: 512,
      font: diagramFont(),
      ...theme(),
    },
    only,
    compact,
    symbolic,
  );
  return raw ? svg(DETAIL_WIDTH, chart.height, chart.body) : svgFile(svg(DETAIL_WIDTH, chart.height, chart.body));
}
function miniature(model: Model, result: Result, showReactions = true, symbolic = false) {
  return beamScene(model, result, {
    width: 560,
    left: 165,
    right: 512,
    font: diagramFont(),
    ...theme(),
    showReactions,
    symbolic,
  });
}
/** Wide layout for Enlarge: values on the left, loads/reactions and response curves on the right, so everything fits one screen. */
const enlargedViews = new Map<string, () => string>();
export function enlargedDiagram(image: string): string | undefined {
  return enlargedViews.get(image)?.();
}
export function analysisDashboard(
  model: Model,
  result: Result,
  section?: Section,
  axis: "y" | "z" = "y",
  raw = false,
  meta?: { material?: string },
) {
  const drawing = dashboard(model, result, section, axis, meta, false);
  if (raw) return drawing;
  const image = svgFile(drawing);
  if (enlargedViews.size > 50) enlargedViews.clear();
  enlargedViews.set(image, () => svgFile(dashboard(model, result, section, axis, meta, true)));
  return image;
}
function dashboard(
  model: Model,
  result: Result,
  section: Section | undefined,
  axis: "y" | "z",
  meta: { material?: string } | undefined,
  wide: boolean,
) {
  const c = theme(),
    font = diagramFont(),
    W = DETAIL_WIDTH;
  const first = model.members[0],
    chips = parameterChips(
      [
        meta?.material?.replace(/^Steel-/i, ""),
        first && "E " + fmt(first.E) + " MPa",
        first?.G && "G " + fmt(first.G) + " MPa",
      ].filter(Boolean) as string[],
      W,
      font,
    );
  let body = chips.body,
    top = chips.height;
  const stations = result.members.flatMap((m) => m.stations.map((s) => ({ ...s, member: m.id })));
  const metrics: MetricCard[] = [];
  for (const [key, title, factor, unit] of [
    ["M", "Bending moment", 1e-6, "kN·m"],
    ["V", "Shear force", 0.001, "kN"],
    ["N", "Axial force", 0.001, "kN"],
  ] as const) {
    if (!activeResponse(result, key)) continue;
    const p = stations.reduce((a, b) => (Math.abs(a[key]) > Math.abs(b[key]) ? a : b));
    metrics.push({
      title,
      value: fmt(p[key] * factor) + " " + unit,
      note:
        (key === "M" ? (p.M < 0 ? "Hogging; " : "Sagging; ") : "") +
        memberName(model, p.member) +
        ", " +
        fmt(p.x / 1000) +
        " m",
    });
  }
  const d = result.deformation;
  if (d && d.curves.some((m) => m.stations.some((s) => Math.abs(s.total) > 1e-8))) {
    const sign = Math.sign(d.total) || 1;
    metrics.push({
      title: "Total deflection",
      value: fmt(d.total) + " mm",
      note:
        fmt(sign * d.bending) +
        " bending " +
        (sign * d.increment < 0 ? "- " : "+ ") +
        fmt(Math.abs(d.increment)) +
        " shear",
      accent: true,
    });
  } else if (activeResponse(result, "v") || activeResponse(result, "globalZ")) {
    const key = activeResponse(result, "v") ? "v" : "globalZ",
      p = stations.reduce((a, b) => (Math.abs(a[key]) > Math.abs(b[key]) ? a : b));
    metrics.push({
      title: key === "v" ? "Bending deflection" : "Vertical movement",
      value: fmt(p[key]) + " mm",
      note: memberName(model, p.member) + ", " + fmt(p.x / 1000) + " m",
      accent: true,
    });
  }
  const cards = metricCards(metrics, W, font);
  body += `<g transform="translate(0,${top})">${cards.body}</g>`;
  top += cards.height;
  const stresses = sectionStresses(model, result, section, axis),
    stressCards: MetricCard[] = [];
  if (stresses) {
    const { tension, compression, shear } = stresses;
    if (tension.value > 1e-8 || compression.value < -1e-8)
      stressCards.push({
        title: "Normal stress",
        value:
          (tension.value > 1e-8 && compression.value < -1e-8
            ? fmt(compression.value) + " to " + fmt(tension.value)
            : fmt(tension.value > 1e-8 ? tension.value : compression.value)) + " MPa",
        valueSize: Math.max(24, font + 4),
      });
    if (Math.abs(shear.value) > 1e-8)
      stressCards.push({
        title: "Shear stress",
        value: fmt(Math.abs(shear.value)) + " MPa",
        valueSize: Math.max(24, font + 4),
      });
  }
  if (stressCards.length) {
    const stress = metricCards(stressCards, W, font);
    body += `<g transform="translate(0,${top})">${stress.body}</g>`;
    top += stress.height;
  }
  const scene = beamScene(model, result, {
    width: W,
    left: section ? 165 : 48,
    right: 512,
    font,
    ...c,
  });
  const sceneH = Math.max(scene.height, section ? sectionPanelHeight(section) : 0) + 12;
  body += `<rect x="0" y="${top}" width="${W}" height="${sceneH}" rx="12" fill="${c.bg}" stroke="${c.border}"/>`;
  body += `<g transform="translate(0,${top + 6})">${section ? sectionPanel(section) + line(128, 15, 128, sceneH - 20) : ""}${scene.body}</g>`;
  top += sceneH + 18;
  let leftBody = "",
    leftTop = 0;
  if (wide) {
    leftBody = body;
    leftTop = top;
    body = "";
    top = 0;
  }
  const chart = responseCharts(model, result, {
    width: W,
    left: section ? 165 : 48,
    right: 512,
    font,
    ...c,
  });
  body += `<g transform="translate(0,${top})">${chart.body}</g>`;
  top += chart.height;
  const note = wrappedLabel(
    12,
    top + smallFont(font) + 8,
    "Forces: " + (model.theory === "euler" ? "Euler" : "Timoshenko") + ". Diagrams use independent scales.",
    W - 24,
    smallFont(font),
    c.sub,
  );
  body += note.body;
  top += note.height + 18;
  if (wide) {
    const gap = 24,
      total = 2 * W + gap,
      height = Math.max(leftTop, top);
    return svg(
      total,
      height,
      `<rect width="${total}" height="${height}" fill="${c.bg}"/><g>${leftBody}</g><g transform="translate(${W + gap},0)">${body}</g>`,
    );
  }
  return svg(W, top, `<rect width="${W}" height="${top}" fill="${c.bg}"/>` + body);
}

/** Formula results remain closed-form. The solver supplies a schematic response curve only. */
const formulaImages = new Map<string, string>();
export function formulaDrawing(f: Formula, section: Section, values: FormulaValues, illustrative = false) {
  if (engineeringIDs.includes(f.id)) return engineeringSketch(f.id, section, values, illustrative);
  const key = JSON.stringify([f.id, section, values, illustrative, environment.appearance, diagramFont()]);
  const cached = formulaImages.get(key);
  if (cached) return cached;
  const image = drawFormula(f, section, values, illustrative);
  if (formulaImages.size >= 128) formulaImages.clear();
  formulaImages.set(key, image);
  return image;
}
function drawFormula(f: Formula, section: Section, values: FormulaValues, illustrative: boolean) {
  if (!f.beam) {
    if (["properties", "modulus", "radius"].includes(f.id)) return sectionDrawing(section);
    const c = theme();
    let body = sectionPanel(section);
    const x = 175,
      end = 485,
      y = 70;
    const arrow = (X: number, Y: number, dx: number) =>
      line(X, Y, X + dx * 25, Y, c.blue, 2) +
      `<path d="M${X + dx * 19},${Y - 4} L${X + dx * 25},${Y} L${X + dx * 19},${Y + 4}" fill="none" stroke="${c.blue}"/>`;
    if (f.id === "euler") {
      body +=
        line(x, y, end, y, c.ink, 2) +
        `<path d="M${x},${y} Q${(x + end) / 2},${y - 60} ${end},${y}" stroke="${c.blue}" fill="none" stroke-dasharray="5 3"/>`;
      body +=
        arrow(x - 28, y, 1) +
        arrow(end + 28, y, -1) +
        text((x + end) / 2, 115, "Effective length = K L") +
        wrappedLabel(175, 153, "Elastic buckling; shape exaggerated", 375, smallFont(), c.sub).body;
    } else {
      body += `<rect x="${x}" y="${y - 14}" width="${end - x}" height="28" fill="${c.blue}" fill-opacity=".12" stroke="${c.ink}"/>`;
      if (f.id === "bending-stress") {
        const moment = rotationVector(end + 25, y, illustrative ? 1 : values.M, 18);
        body +=
          text(330, 35, "Bending moment M") +
          (moment
            ? `<path d="${moment.arc}" fill="none" stroke="${c.blue}"/><path d="${moment.head}" fill="none" stroke="${c.blue}"/>`
            : "") +
          `<path d="M300,51 L326,51 L274,79 L300,79 Z" fill="${c.blue}" fill-opacity=".3" stroke="${c.blue}"/>`;
      } else if (f.id === "rect-shear")
        body +=
          line(330, 30, 330, 100, c.blue, 2) +
          `<path d="M324,94 L330,100 L336,94" fill="none" stroke="${c.blue}"/>` +
          text(368, 35, "V") +
          `<path d="M510,38 Q550,70 510,102 Z" fill="${c.blue}" fill-opacity=".25" stroke="${c.blue}"/>` +
          text(330, 122, "Parabolic shear stress");
      else
        body +=
          arrow(x, y, values.N < 0 && !illustrative ? 1 : -1) +
          arrow(end, y, values.N < 0 && !illustrative ? -1 : 1) +
          text(330, 35, "N") +
          text(330, 114, f.id === "axial-deformation" ? "L becomes L + dL" : "Normal stress σ = N/A");
      body += wrappedLabel(175, 173, "Separate section / member scales", 375, smallFont(), c.sub).body;
    }
    return svgFile(svg(DETAIL_WIDTH, Math.max(sectionPanelHeight(section), 220), body));
  }
  const v = illustrative
    ? {
        ...values,
        L: values.L > 0 ? values.L : 6000,
        P: Number.isFinite(values.P) ? values.P : 10000,
        q: Number.isFinite(values.q) ? values.q : 3,
        E: values.E > 0 ? values.E : 11000,
        I: values.I > 0 ? values.I : section.Iy,
      }
    : values;
  if (illustrative && !(v.a >= 0 && v.a <= v.L)) v.a = v.L / 2;
  const model = buildModel({
    template: f.beam,
    spans: f.beam === "continuous" ? [v.L / 1000, v.L / 1000] : [v.L / 1000],
    pitch: 0,
    section: { ...section, Iyz: 0 },
    material: {
      id: "illustration",
      family: "",
      E: v.E || 11000,
      G: null,
      density: null,
      status: "",
      source: "",
      raw: {},
    },
    E: v.E || 11000,
    axis: "y",
    q: f.loading === "udl" ? -v.q : 0,
    point:
      f.loading === "point"
        ? {
            member: "M1",
            value: -v.P,
            position: (f.inputs.includes("a") ? v.a : f.id.startsWith("cant-point") ? v.L : v.L / 2) / 1000,
          }
        : undefined,
    direction: "globalZ",
    basis: "member",
    theory: "euler",
    tie: false,
    ridgeHinge: false,
    selfWeight: false,
    leftOverhang: 0,
    rightOverhang: 0,
  });
  for (const m of model.members) m.I = v.I > 0 ? v.I : section.Iy;
  const result = analyze(model),
    output = f.id.split("@")[1];
  const mini = miniature(model, result, output === "reactions", illustrative);
  let body = sectionPanel(section) + mini.body;
  const key = ({ moment: "M", shear: "V", deflection: "v" } as const)[output as "moment" | "shear" | "deflection"];
  let height = Math.max(sectionPanelHeight(section), mini.height);
  if (key) {
    const chart = resultDiagrams(model, result, key, true, true, illustrative);
    const h = Number(chart.match(/height="([\d.]+)"/)?.[1] || 0);
    body += `<g transform="translate(0,${height})">${chart}</g>`;
    height += h;
  }
  return svgFile(svg(DETAIL_WIDTH, height, body));
}
/** Linear temperature difference, with an illustrative deformed shape before calculation. */
export function temperatureDrawing(model: Model, result: Result, section: Section, dT: number, symbolic = false) {
  const mini = miniature(model, result, true, symbolic);
  let body =
    sectionPanel(section) +
    `<g>${mini.body}<text x="335" y="32" text-anchor="middle" style="fill:#d75f45">Top: T + ${symbolic ? "ΔT" : fmt(dT) + " K"}</text><text x="335" y="70" text-anchor="middle" style="fill:${theme().blue}">Bottom: T</text></g>`;
  const charts = resultDiagrams(
      model,
      result,
      symbolic ? (activeResponse(result, "v") ? "v" : "M") : undefined,
      true,
      true,
      symbolic,
    ),
    h = Number(charts.match(/height="([\d.]+)"/)?.[1] || 0),
    top = Math.max(sectionPanelHeight(section), mini.height);
  body += `<g transform="translate(0,${top})">${charts}</g>`;
  return svgFile(svg(DETAIL_WIDTH, top + h, body));
}
