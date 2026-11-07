import { Formula, FormulaValues, Answer } from "../core/formulas";
import { Material, Section } from "../core/types";
import {
  columnFactors,
  ColumnFactors,
  steelReduction,
  timberReduction,
  timberLTBReduction,
  stVenant,
  lateralBuckling,
  warpingTorsion,
  torqueCases,
  ltbCases,
  materialStrength,
  isSteel,
} from "../core/stability-torsion";
import { equation } from "./equations";
import { metricCards, parameterChips } from "./panels";
import { svgFile, fmt } from "./state";
import { palette, svgLabel, readableFont, wrappedLabel } from "./visual-style";
import { sectionDrawing } from "./drawings";
const W = 560;
const svg = (body: string, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}"><style>text{font-family:Arial,sans-serif}</style><rect width="${W}" height="${h}" fill="${palette().bg}"/>${body}</svg>`;
const image = (body: string, h: number) => svgFile(svg(body, h));
const deg = (v: number) => (v * 180) / Math.PI;
const token = (n: number) => Number(n.toPrecision(7)).toString();
const mark = (uri: string, alt = "Engineering diagram") => `![${alt}](${uri})`;
function equationBlock(lines: string[]) {
  return lines.map(equation).join("\n\n");
}
export function reductionPlot(
  series: {
    name: string;
    lambda: number;
    factor: number;
    curve: (x: number) => number;
  }[],
) {
  const c = palette(),
    font = readableFont(),
    left = 58,
    right = 536,
    top = 42,
    bottom = 218;
  const maxX = Math.max(3, ...series.map((s) => s.lambda * 1.15)),
    X = (v: number) => left + (v / maxX) * (right - left),
    Y = (v: number) => bottom - v * (bottom - top);
  const colors = [c.blue, c.green];
  let body = svgLabel(left, 26, "Reduction factor", font, c.ink, 500);
  for (const y of [0, 0.5, 1])
    body +=
      `<path d="M${left},${Y(y)}H${right}" stroke="${c.border}"/>` +
      svgLabel(left - 10, Y(y) + 6, String(y), 18, c.sub, 400, "end");
  for (const x of [0, maxX / 2, maxX]) body += svgLabel(X(x), bottom + 27, fmt(x), 18, c.sub, 400, "middle");
  series.forEach((s, j) => {
    const points = Array.from({ length: 161 }, (_, i) => {
      const x = (maxX * i) / 160;
      return `${X(x)},${Y(s.curve(x))}`;
    }).join(" ");
    body += `<polyline points="${points}" fill="none" stroke="${colors[j % 2]}" stroke-width="3"/><path d="M${X(s.lambda)},${bottom}V${Y(s.factor)}" stroke="${colors[j % 2]}" stroke-dasharray="4 4"/><circle cx="${X(s.lambda)}" cy="${Y(s.factor)}" r="6" fill="${colors[j % 2]}"/>`;
    body += svgLabel(
      16,
      285 + j * 30,
      `${s.name}: λ ${fmt(s.lambda)}; factor ${fmt(s.factor)} (${fmt(100 * s.factor)}%)`,
      20,
      colors[j % 2],
      500,
    );
  });
  body += svgLabel(right, 267, "Relative slenderness λ", 18, c.sub, 400, "end");
  return image(body, 295 + series.length * 30);
}
function columnGraphic(r: ColumnFactors) {
  const c = palette(),
    cards = metricCards(
      r.axes.map((a) => ({
        title: `${r.code === "EC3" ? "χ" : "kc"},${a.axis}`,
        value: fmt(a.factor),
        note: `λrel ${fmt(a.lambda)}; Ncr ${fmt(a.Ncr / 1000)} kN`,
        accent: a.factor === Math.min(...r.axes.map((x) => x.factor)),
      })),
    ),
    chips = parameterChips([
      `${r.code} factors — FYI`,
      `E ${fmt(r.E)} MPa`,
      `${r.code === "EC3" ? "fy" : "fc0,k"} ${fmt(r.strength)} MPa`,
    ]);
  let body = cards.body + `<g transform="translate(0,${cards.height})">${chips.body}</g>`;
  const y = cards.height + chips.height + 10;
  r.axes.forEach((a, i) => {
    const x = 20 + i * 280;
    body +=
      svgLabel(x, y + 22, `About ${a.axis}; Lcr ${fmt(a.length / 1000)} m`, 20, c.sub) +
      `<path d="M${x + 20},${y + 80}H${x + 240}" stroke="${c.line}" stroke-width="2"/><path d="M${x + 20},${y + 80}Q${x + 130},${y + 10} ${x + 240},${y + 80}" stroke="${i ? c.green : c.blue}" stroke-width="3" fill="none"/><path d="M${x + 2},${y + 80}h20m-6,-5l6,5l-6,5M${x + 258},${y + 80}h-20m6,-5l-6,5l6,5" fill="none" stroke="${c.ink}" stroke-width="2"/>`;
  });
  return image(body, y + 110);
}
export function columnFYI(s: Section, m: Material, v: FormulaValues) {
  if (!v.eulerAboutSection) return "";
  let r: ColumnFactors | undefined;
  try {
    r = columnFactors(s, m, v.L, v.E, v.K, v);
  } catch (e) {
    const p = materialStrength(m, v);
    return `**Material buckling factors — FYI**\n\n${(e as Error).message}. Use **Edit inputs → Buckling FYI** or type a named value.${isSteel(m) && p.nominalFy ? ` A selectable nominal-grade suggestion is fy=${p.nominalFy}MPa; confirm the applicable product and thickness first.` : ""}`;
  }
  if (!r) return "";
  const timber = r.code === "EC5";
  return `**${r.code} column factors — FYI**\n\n${mark(columnGraphic(r), "Column factors overview")}\n\n${mark(reductionPlot(r.axes.map((a) => ({ name: `${timber ? "kc" : "χ"},${a.axis}`, lambda: a.lambda, factor: a.factor, curve: (x) => (timber ? timberReduction(x, a.imperfection) : steelReduction(x, a.imperfection)) }))), "Column reduction curves")}\n\n${equationBlock(
    [
      String.raw`N_{cr,j}=\frac{\pi^2 ${timber ? "E_{0,05}" : "E"}I_j}{L_{cr,j}^2},\quad\lambda_{rel,j}=\sqrt{\frac{${timber ? "Af_{c,0,k}" : "A_{ref}f_y"}}{N_{cr,j}}}`,
      timber
        ? String.raw`k_j=\frac{1+\beta_c(\lambda_{rel,j}-0.3)+\lambda_{rel,j}^2}{2}`
        : String.raw`\Phi_j=\frac{1+\alpha_j(\bar\lambda_j-0.2)+\bar\lambda_j^2}{2}`,
      timber
        ? String.raw`k_{c,j}=\frac{1}{k_j+\sqrt{k_j^2-\lambda_{rel,j}^2}};\quad k_{c,j}=1\;\mathrm{if}\;\lambda_{rel,j}\leq0.3`
        : String.raw`\chi_j=\min\left(1,\frac{1}{\Phi_j+\sqrt{\Phi_j^2-\bar\lambda_j^2}}\right)`,
      ...r.axes.flatMap((a) => [
        String.raw`N_{cr,${a.axis}}=\frac{\pi^2\times${token(r.E)}\times${token(a.inertia)}}{${token(a.length)}^2}=${token(a.Ncr / 1000)}\,\mathrm{kN}`,
        String.raw`\lambda_{rel,${a.axis}}=\sqrt{\frac{${token(r.area)}\times${token(r.strength)}}{${token(a.Ncr)}}}=${token(a.lambda)}`,
      ]),
    ],
  )}\n\n${r.axes.map((a) => `**${timber ? "kc" : "χ"},${a.axis} = ${fmt(a.factor)}**; λrel = ${fmt(a.lambda)}; ${timber ? "βc" : "α"} = ${fmt(a.imperfection)}.`).join("\n\n")}\n\n${r.notes.join("\n\n")}\n\nFirst-generation ${timber ? "EN 1995-1-1:2004, 6.3.2" : "EN 1993-1-1:2005, 6.3.1"}. Factors only; no design resistance or pass/fail result.`;
}
function torqueArrow(x: number, y: number, positive: boolean, label: string) {
  const c = palette(),
    sign = positive ? 1 : -1;
  return (
    `<path d="M${x - 14},${y - 18}C${x + 32},${y - 35} ${x + 32},${y + 35} ${x - 14},${y + 18}" fill="none" stroke="${c.blue}" stroke-width="3"/>` +
    (sign > 0 ? `<path d="M${x - 4},${y + 10}l-10,8l12,4"` : `<path d="M${x - 4},${y - 10}l-10,-8l12,-4"`) +
    ` fill="none" stroke="${c.blue}" stroke-width="3"/>` +
    svgLabel(x, y - 43, label, 20, c.ink, 500, "middle")
  );
}
export function engineeringSketch(id: string, s: Section, v: FormulaValues, illustrative = false) {
  const c = palette(),
    L = Number.isFinite(v.L) ? v.L / 1000 : 3,
    T = Number.isFinite(v.T) ? v.T! / 1e6 : 1;
  let body = "";
  if (id === "ltb") {
    // Perspective elevation: displaced flanges and rotated end cross-section distinguish twist from simple flexure.
    body += svgLabel(18, 27, "Lateral displacement + twist", 22, c.ink, 500);
    for (const y of [78, 118])
      body += `<path d="M60,${y}H495" stroke="${c.line}" stroke-dasharray="5 4"/><path d="M60,${y}C190,${y - 52} 365,${y - 42} 495,${y}" fill="none" stroke="${c.blue}" stroke-width="3"/>`;
    for (const [x, dy] of [
      [60, 0],
      [165, -29],
      [278, -35],
      [390, -25],
      [495, 0],
    ])
      body += `<path d="M${x},${78 + dy}l12,38" stroke="${c.blue}" stroke-width="2"/>`;
    body += `<path d="M60,70v68m435,-68v68" stroke="${c.ink}" stroke-width="4"/>`;
    body +=
      svgLabel(60, 164, "A", 20, c.sub) +
      svgLabel(485, 164, "B", 20, c.sub) +
      svgLabel(278, 195, `${illustrative ? "Example " : ""}Lb = ${fmt(L)} m`, 22, c.ink, 500, "middle");
    body += svgLabel(278, 228, ltbCases[v.ltbCase ?? 0], 20, c.sub, 400, "middle");
    body += svgLabel(278, 260, "Fork supports; shape exaggerated", 18, c.sub, 400, "middle");
    return image(body, 280);
  }
  const mode = v.torqueCase ?? 0,
    point = id === "torsion-warping" && Number.isFinite(v.a) ? Math.max(0, Math.min(1, v.a / v.L)) : 1;
  body += `<path d="M65,90H490v32H65z" fill="${c.accent}" stroke="${c.ink}" stroke-width="2"/>`;
  body += `<path d="M65,70v72${id === "torsion-warping" && mode >= 2 ? "M490,70v72" : ""}" stroke="${c.ink}" stroke-width="4"/>`;
  body += torqueArrow(65 + 425 * point, 105, T >= 0, `T ${fmt(T)} kN·m`);
  body += svgLabel(65, 175, "A", 20, c.sub) + svgLabel(490, 175, "B", 20, c.sub);
  body += svgLabel(
    278,
    207,
    Number.isFinite(v.L)
      ? `L ${fmt(L)} m${id === "torsion-warping" ? `; torque at ${fmt(point * L)} m` : ""}`
      : "Length optional for total twist",
    20,
    c.ink,
    400,
    "middle",
  );
  const label = id === "torsion-warping" ? torqueCases[mode] : "Free warping; St. Venant torsion";
  const note = wrappedLabel(18, 245, label, 524, 20, c.sub);
  body += note.body;
  return image(body, 250 + note.height);
}
function linePlot(
  name: string,
  unit: string,
  series: { name: string; points: [number, number][]; dash?: string }[],
  L: number,
) {
  const c = palette(),
    x0 = 92,
    x1 = 535,
    top = 53,
    bottom = 169,
    colors = [c.blue, c.green, c.sub];
  const max = Math.max(1e-15, ...series.flatMap((s) => s.points.map((p) => Math.abs(p[1])))),
    X = (v: number) => x0 + ((x1 - x0) * v) / L,
    Y = (v: number) => (top + bottom) / 2 - ((v / max) * (bottom - top)) / 2;
  let body =
    svgLabel(12, 28, `${name} [${unit}]`, 22, c.ink, 500) + `<path d="M${x0},${Y(0)}H${x1}" stroke="${c.line}"/>`;
  const tick = (n: number) => (Math.abs(n) >= 1000 || (n !== 0 && Math.abs(n) < 0.01) ? n.toExponential(1) : fmt(n, 2));
  body +=
    svgLabel(x0 - 8, Y(max) + 6, tick(max), 18, c.sub, 400, "end") +
    svgLabel(x0 - 8, Y(-max) + 6, tick(-max), 18, c.sub, 400, "end");
  series.forEach((s, j) => {
    const pts = s.points.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
    body += `<polyline points="${pts}" fill="none" stroke="${colors[j % 3]}" stroke-width="3" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""}/>`;
    body += svgLabel(14, 226 + j * 27, s.name, 19, colors[j % 3]);
  });
  body += svgLabel(x0, 199, "A: 0", 18, c.sub) + svgLabel(x1, 199, `B: ${fmt(L / 1000)} m`, 18, c.sub, 400, "end");
  return image(body, 240 + series.length * 27);
}
function stressLocations(s: Section, kind: string) {
  if (s.shape !== "i") return sectionDrawing(s);
  const c = palette();
  let body = svgLabel(18, 28, "Stress locations — ideal I-section", 22, c.ink, 500);
  body += `<path d="M175,68H385v20H290v110H385v20H175v-20H270V88H175Z" fill="${c.soft}" stroke="${c.ink}" stroke-width="2"/>`;
  if (kind === "normal")
    for (const [x, y, t] of [
      [175, 78, "+"],
      [385, 78, "−"],
      [175, 208, "−"],
      [385, 208, "+"],
    ] as const)
      body +=
        `<circle cx="${x}" cy="${y}" r="14" fill="${c.accent}" stroke="${c.blue}"/>` +
        svgLabel(x, y + 7, t, 22, c.blue, 500, "middle");
  else if (kind === "warping")
    for (const y of [78, 208]) body += `<circle cx="280" cy="${y}" r="9" fill="${c.green}"/>`;
  else
    for (const [x, y] of [
      [210, 68],
      [350, 88],
      [210, 218],
      [350, 198],
    ])
      body += `<circle cx="${x}" cy="${y}" r="6" fill="${c.blue}"/>`;
  const text =
    kind === "normal"
      ? "Warping normal: opposite flange-tip signs; pattern reverses with B"
      : kind === "warping"
        ? "Warping shear: flange/web junction; thin-wall approximation"
        : "St. Venant shear: plate surfaces; through-thickness distribution";
  const note = wrappedLabel(18, 255, text, 524, 20, c.sub);
  body += note.body;
  return image(body, 265 + note.height);
}
export function engineeringMarkdown(
  f: Formula,
  s: Section,
  m: Material,
  v: FormulaValues,
  answers: Answer[],
  problem = "",
  next = "",
) {
  const chips = parameterChips(
    [
      m.id,
      s.id,
      Number.isFinite(v.L) ? `L ${fmt(v.L / 1000)} m` : "",
      ...(f.id !== "ltb" && Number.isFinite(v.T) ? [`T ${fmt(v.T! / 1e6)} kN·m`] : []),
    ].filter(Boolean),
  );
  const cards = metricCards(
    answers.slice(0, f.id === "torsion-warping" ? 2 : f.id === "ltb" ? 1 : 3).map((a) => ({
      title: a.label,
      value: `${fmt(a.value)} ${a.unit}`,
      accent: true,
    })),
  );
  const overview = image(
    chips.body + `<g transform="translate(0,${chips.height})">${cards.body}</g>`,
    chips.height + cards.height,
  );
  const header = `**${f.title}**\n\n${answers.length ? mark(overview, "Engineering overview: " + answers.map((a) => `${a.label} ${fmt(a.value)} ${a.unit}`).join("; ")) + "\n\n" : ""}${mark(engineeringSketch(f.id, s, v, !answers.length), "Member arrangement")}\n\n${problem ? `**Check input:** ${problem}\n\n` : !answers.length ? `**Next:** ${next}\n\n` : ""}`;
  if (!answers.length)
    return (
      header +
      `Example: ${f.id === "ltb" ? "uniform moment, 3m, S355, IPE200, fy=355MPa" : f.id === "torsion-sv" ? "T=1kNm, S355, IPE200, 3m" : "cantilever restrained, 3m, T=1kNm, S355, IPE200"}. Type values only, separated by commas.\n\n${f.note}`
    );
  if (f.id === "torsion-sv") {
    const r = stVenant(s, v.G!, v.T!, Number.isFinite(v.L) ? v.L : undefined, v);
    return (
      header +
      mark(stressLocations(s, "sv"), "Torsional stress diagram") +
      "\n\n" +
      equationBlock([
        r.equation,
        String.raw`\theta'=\frac{T}{GJ}=\frac{${token(v.T!)}}{${token(v.G!)}\times${token(r.J)}}=${token(r.rate)}\,\mathrm{rad/mm}`,
        ...(r.twist === undefined
          ? []
          : [String.raw`\theta=\theta'L=${token(r.rate)}\times${token(v.L)}=${token(deg(r.twist))}\,\mathrm{deg}`]),
      ]) +
      `\n\n**${r.method}**\n\n${r.notes.join("\n\n")}\n\nJ = ${fmt(r.J)} mm⁴; G = ${fmt(v.G!)} MPa.\n\nSt. Venant torsion assumes free warping. Peak stress is calculated for the selected geometry, not with a universal Tr/J equation.\n\n[Theory: SCI P385](https://www.steelconstruction.info/images/6/6f/Sci_p385.pdf)`
    );
  }
  if (f.id === "ltb") {
    const r = lateralBuckling(s, m, v.L, v.E, v.G!, v),
      timber = r.code === "EC5";
    const tex = timber
      ? String.raw`M_{cr}=\frac{\pi}{l_{eff}}\sqrt{E_{0,05}I_zG_{0,05}J}`
      : String.raw`M_{cr}=C_1\frac{\pi^2EI_z}{(kL_b)^2}\left[\sqrt{\left(\frac{k}{k_w}\right)^2\frac{I_w}{I_z}+\frac{(kL_b)^2GJ}{\pi^2EI_z}+(C_2z_g)^2}-C_2z_g\right]`;
    const elasticEquations = timber
      ? equation(tex)
      : equationBlock([
          String.raw`M_{cr}=C_1\frac{\pi^2EI_z}{(kL_b)^2}\left(\sqrt{H+(C_2z_g)^2}-C_2z_g\right)`,
          String.raw`H=\left(\frac{k}{k_w}\right)^2\frac{I_w}{I_z}+\frac{(kL_b)^2GJ}{\pi^2EI_z}`,
        ]);
    const fyicards = metricCards(
      answers.slice(1).map((a) => ({
        title: a.label,
        value: fmt(a.value) + " " + a.unit,
        accent: true,
      })),
    );
    const strengths = materialStrength(m, v);
    const numericLTB = timber
      ? ""
      : equationBlock([
          String.raw`P_0=\frac{\pi^2\times${token(r.E)}\times${token(s.Iz)}}{(${token(r.k)}\times${token(v.L)})^2}`,
          String.raw`H=\left(\frac{${token(r.k)}}{${token(r.kw)}}\right)^2\frac{${token(r.Iw)}}{${token(s.Iz)}}+\frac{(${token(r.k)}\times${token(v.L)})^2\times${token(r.G)}\times${token(r.J)}}{\pi^2\times${token(r.E)}\times${token(s.Iz)}}`,
          String.raw`M_{cr}=${token(r.C1)} P_0\left[\sqrt{H+(${token(r.C2 * r.zg)})^2}-${token(r.C2 * r.zg)}\right]`,
        ]);
    return (
      header +
      `**Elastic critical moment**\n\n${elasticEquations}\n\n${numericLTB}\n\n${equation(timber ? String.raw`M_{cr}=\frac{\pi}{${token(r.length)}}\sqrt{${token(r.E)}\times${token(s.Iz)}\times${token(r.G)}\times${token(r.J)}}=${token(r.Mcr / 1e6)}\,\mathrm{kNm}` : String.raw`M_{cr}=${token(r.Mcr / 1e6)}\,\mathrm{kNm}`)}\n\n${mark(sectionDrawing(s), "Selected section diagram")}\n\n${r.factor === undefined ? "" : `**${r.code} factors — FYI**\n\n${mark(image(fyicards.body, fyicards.height), "LTB factor overview")}\n\n${mark(reductionPlot([{ name: timber ? "kcrit" : "χLT", lambda: r.lambda!, factor: r.factor, curve: (x) => (timber ? timberLTBReduction(x) : steelReduction(x, v.alphaLT ?? 0.34)) }]), "LTB reduction curve")}\n\n${equationBlock(timber ? [String.raw`\sigma_{m,crit}=M_{cr}/W_{el,y},\quad\lambda_{rel,m}=\sqrt{f_{m,k}/\sigma_{m,crit}}`, String.raw`k_{crit}=\begin{cases}1&\lambda_{rel,m}\leq0.75\\1.56-0.75\lambda_{rel,m}&0.75<\lambda_{rel,m}\leq1.4\\1/\lambda_{rel,m}^2&\lambda_{rel,m}>1.4\end{cases}`] : [String.raw`\bar\lambda_{LT}=\sqrt{W_{ref,y}f_y/M_{cr}}`, String.raw`\Phi_{LT}=\frac{1+\alpha_{LT}(\bar\lambda_{LT}-0.2)+\bar\lambda_{LT}^2}{2}`, String.raw`\chi_{LT}=\min\left(1,\frac{1}{\Phi_{LT}+\sqrt{\Phi_{LT}^2-\bar\lambda_{LT}^2}}\right)`])}\n\n`}${r.notes.join("\n\n")}\n\n${(timber ? strengths.fm : strengths.fy) === undefined ? "" : `Reference strength ${fmt((timber ? strengths.fm : strengths.fy)!)} MPa.`} C1 ${fmt(r.C1)}, C2 ${fmt(r.C2)}, zg ${fmt(r.zg)} mm; k ${fmt(r.k)}, kw ${fmt(r.kw)}.\n\nEffective length ${fmt(r.length / 1000)} m; E ${fmt(r.E)} MPa; G ${fmt(r.G)} MPa; Wref,y ${fmt(r.W)} mm³; J ${fmt(r.J)} mm⁴; Iw ${fmt(r.Iw)} mm⁶.\n\n${f.note}\n\n[Steel: NCCI SN003b, Table 3.2](https://steelconstruction.info/images/0/0f/SN003b.pdf) · [Timber: Swedish Wood, Volume 2](https://www.svenskttra.se/siteassets/5-publikationer/pdfer/design-of-timber-structures-2-2016.pdf)`
    );
  }
  const r = warpingTorsion(s, v.E, v.G!, v.T!, v.L, v.a, v),
    stations = r.stations;
  const stressCards = metricCards(
    answers.slice(2).map((a) => ({ title: a.label, value: `${fmt(a.value)} ${a.unit}` })),
  );
  const peak = (key: "sigma" | "tauSV" | "tauW") =>
    stations.reduce((best, p) => (Math.abs(p[key] ?? 0) > Math.abs(best[key] ?? 0) ? p : best), stations[0]);
  const workedStress: string[] = [];
  const normal = peak("sigma"),
    sv = peak("tauSV"),
    shear = peak("tauW");
  if (s.shape === "i") {
    const Ww = v.Ww ?? (Number(s.raw.Ww || s.raw.Womega || s.raw.W_omega) || r.Iw / (((s.h - s.tf) * s.b) / 4));
    if (normal.sigma !== undefined)
      workedStress.push(
        String.raw`|\sigma_\omega|_{max}=\frac{${token(Math.abs(normal.B))}}{${token(Ww)}}=${token(Math.abs(normal.sigma))}\,\mathrm{MPa}`,
      );
    if (sv.tauSV !== undefined)
      workedStress.push(
        v.Wt
          ? String.raw`|\tau_{SV}|_{max}=\frac{${token(Math.abs(sv.Tsv))}}{${token(v.Wt)}}=${token(sv.tauSV)}\,\mathrm{MPa}`
          : String.raw`|\tau_{SV}|_{max}\approx\frac{${token(Math.abs(sv.Tsv))}\times${token(Math.max(s.tf, s.tw))}}{${token(r.J)}}=${token(sv.tauSV)}\,\mathrm{MPa}`,
      );
    if (shear.tauW !== undefined)
      workedStress.push(
        String.raw`|\tau_\omega|_{max}\approx\frac{${token(Math.abs(shear.Tw))}\times${token((s.tf * (s.h - s.tf) * s.b * s.b) / 16)}}{${token(r.Iw)}\times${token(s.tf)}}=${token(Math.abs(shear.tauW))}\,\mathrm{MPa}`,
      );
  }
  return (
    header +
    mark(image(stressCards.body, Math.max(1, stressCards.height)), "Torsion stress overview") +
    `\n\n**Peak locations along the member**\n\n${[
      ["tauSV", "St. Venant shear"],
      ["sigma", "Warping normal"],
      ["tauW", "Warping shear"],
    ]
      .filter(([k]) => stations.some((p) => (p as any)[k] !== undefined))
      .map(([k, label]) => `${label}: x=${fmt(peak(k as any).x / 1000)} m.`)
      .join(
        "\n\n",
      )}\n\n${mark(linePlot("Twist", "deg", [{ name: "θ(x)", points: stations.map((p) => [p.x, deg(p.theta)]) }], v.L), "Twist diagram")}\n\n${mark(
      linePlot(
        "Torque components",
        "kN·m",
        [
          {
            name: "St. Venant Tsv",
            points: stations.map((p) => [p.x, p.Tsv / 1e6]),
          },
          {
            name: "Warping Tw",
            points: stations.map((p) => [p.x, p.Tw / 1e6]),
          },
          {
            name: "Total Tsv + Tw",
            points: stations.map((p) => [p.x, p.T / 1e6]),
            dash: "5 4",
          },
        ],
        v.L,
      ),
      "Torque split diagram",
    )}\n\n${mark(linePlot("Bimoment", "kN·m²", [{ name: "B = −EIw θ″", points: stations.map((p) => [p.x, p.B / 1e9]) }], v.L), "Bimoment diagram")}\n\n**Stress recovery**\n\n${equationBlock(workedStress)}\n\n${equationBlock([String.raw`T_{SV}=GJ\theta',\quad T_w=-EI_w\theta''',\quad T=T_{SV}+T_w`, String.raw`B=-EI_w\theta'',\quad\sigma_\omega=\frac{B\omega}{I_w}`, String.raw`\tau_\omega=\frac{T_wS_\omega}{I_wt}`])}\n\n${mark(stressLocations(s, "normal"), "Warping normal stress diagram")}\n\n${s.shape === "i" ? mark(stressLocations(s, "warping"), "Warping shear stress diagram") : ""}\n\n**Support reactions**\n\n${r.reactions.map((p) => `At ${p.x === 0 ? "A" : "B"}: torque **${fmt(p.T / 1e6)} kN·m**, warping reaction **${fmt(p.B / 1e9)} kN·m²**.`).join("\n\n")}\n\n${r.notes.join("\n\n")}\n\nJ ${fmt(r.J)} mm⁴; Iw ${fmt(r.Iw)} mm⁶; E ${fmt(v.E)} MPa; G ${fmt(v.G!)} MPa.\n\nNo combined equivalent stress is formed from maxima at different points.\n\n[Theory and stress recovery: SCI P385](https://www.steelconstruction.info/images/6/6f/Sci_p385.pdf)`
  );
}

/** Focused result rows avoid scrolling through unrelated plots. The overview retains the full worked calculation. */
export function engineeringDetailViews(id: string, markdown: string) {
  const images = [...markdown.matchAll(/!\[([^\]]*)\]\((data:image\/png;base64,[^)]+)\)/g)];
  const rows: { title: string; markdown: string }[] = [];
  const add = (title: string, match: RegExp) => {
    const picked = images.filter((m) => match.test(m[1]));
    if (picked.length)
      rows.push({
        title,
        markdown: `**${title}**\n\n` + picked.map((m) => m[0]).join("\n\n"),
      });
  };
  if (id === "euler") {
    add("Material factors", /^Column/);
  }
  if (id === "ltb") {
    add("Stability factor", /^LTB factor|^LTB reduction/);
    add("Section", /^Selected section/);
  }
  if (id === "torsion-sv") add("Stress locations", /^Torsional stress/);
  if (id === "torsion-warping") {
    add("Section stresses", /^Torsion stress overview|^Warping normal stress|^Warping shear stress/);
    add("Twist", /^Twist diagram/);
    add("Torque split", /^Torque split diagram/);
    add("Bimoment", /^Bimoment diagram/);
  }
  if (["euler", "ltb", "torsion-sv", "torsion-warping"].includes(id)) add("Equations", /^Equation\b/);
  return rows;
}
