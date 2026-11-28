import { diagramLayout } from "../core/diagram-layout";
import { smallFont, wrapLabel } from "./visual-style";
import { Model, Result } from "../core/types";
import { activeResponse, memberName, ResponseKey } from "../core/presentation";
import { fmt } from "./state";
import { SceneOptions } from "./beam-scene";
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
export function responseCharts(
  model: Model,
  result: Result,
  o: SceneOptions,
  only?: ResponseKey,
  compact = true,
  symbolic = false,
) {
  const view = diagramLayout(model, o.left, o.right),
    f = o.font;
  o = { ...o, left: view.left, right: view.right };
  const row = result.members.length > 3 ? Math.max(220, f * 10) : Math.max(156, f * 7.2),
    amp = Math.min(44, row * 0.25);
  const totalLength = result.members.reduce((s, m) => s + m.length, 0),
    split = result.deformation;
  const labels = [
    ["N", "Axial N", "kN", 0.001],
    ["V", "Shear V", "kN", 0.001],
    ["M", "Moment M", "kN·m", 1e-6],
    ["v", split ? "Deflection" : "Deflection v", "mm", 1],
    ["globalZ", "Vertical movement", "mm", 1],
  ] as const;
  const label = (x: number, y: number, s: string, color = o.ink, size = smallFont(f), anchor = "start") =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" style="font-size:${size}px;fill:${color}">${esc(s)}</text>`;
  const ln = (x: number, y: number, X: number, Y: number, color = o.line, extra = "") =>
    `<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${color}" ${extra}/>`;
  const poly = (pts: number[][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  let top = 0,
    body = "",
    hasSplit = false;
  for (const [key, title, unit, factor] of labels) {
    if ((only && key !== only) || (!only && key === "globalZ" && (activeResponse(result, "v") || split))) continue;
    const decomposition = key === "v" ? split : undefined;
    if (!decomposition && !activeResponse(result, key)) continue;
    if (
      decomposition &&
      !decomposition.curves.some((m) => m.stations.some((s) => Math.abs(s.total) > 1e-8 || Math.abs(s.bending) > 1e-8))
    )
      continue;
    const base = top + row * 0.5,
      small = smallFont(f);
    const titleLines = wrapLabel(title, Math.max(100, o.left - 30), f);
    const labelTop = top + row / 2 - ((titleLines.length - 1) * (f + 5)) / 2 - 8;
    titleLines.forEach((value, i) => (body += label(12, labelTop + i * (f + 5), value, o.ink, f)));
    body += label(12, labelTop + titleLines.length * (f + 5), unit, o.sub, small);
    const max = Math.max(
      1e-12,
      ...result.members.flatMap((m) =>
        decomposition
          ? decomposition.curves
              .find((c) => c.member === m.id)!
              .stations.flatMap((s) => [Math.abs(s.total), Math.abs(s.bending), Math.abs(s.increment)])
          : m.stations.map((s) => Math.abs(s[key])),
      ),
    );
    let offset = o.left;
    const labelled: { x: number; value: number }[] = [];
    for (const [memberIndex, m] of result.members.entries()) {
      const len = ((o.right - o.left) * m.length) / totalLength;
      const stations = decomposition
        ? decomposition.curves.find((c) => c.member === m.id)!.stations.map((s) => ({ ...s, value: s.total }))
        : m.stations.map((s) => ({ x: s.x, value: s[key] }));
      const X = (x: number) => offset + (len * x) / m.length,
        Y = (v: number) => base - (v / max) * amp;
      const pts = stations.map((s) => [X(s.x), Y(s.value)]);
      body += ln(offset, base, offset + len, base);
      body += `<path data-response="${key}" d="M${offset},${base} ${poly(pts).replace(/^M/, "L")} L${offset + len},${base} Z" fill="${o.blue}" fill-opacity=".13"/>`;
      if (decomposition) {
        hasSplit = true;
        const d = decomposition.curves.find((c) => c.member === m.id)!.stations;
        const bending = d.map((s) => [X(s.x), Y(s.bending)]),
          shear = d.map((s) => [X(s.x), Y(s.increment)]);
        body += `<path d="${poly([...pts, ...bending.slice().reverse()])} Z" fill="#b97d23" fill-opacity=".3"/>`;
        body += `<path data-deflection="bending" d="${poly(bending)}" fill="none" stroke="${o.sub}" stroke-dasharray="6 4" stroke-width="1.5"/>`;
        body += `<path data-deflection="shear-increment" d="${poly(shear)}" fill="none" stroke="#b97d23" stroke-dasharray="2 4" stroke-width="1.8"/>`;
      } else {
        const step = Math.max(1, Math.floor(stations.length / 20));
        for (let j = 0; j < stations.length; j += step)
          body += ln(
            X(stations[j].x),
            base,
            X(stations[j].x),
            Y(stations[j].value),
            o.blue,
            'stroke-width=".6" opacity=".35"',
          );
      }
      body += `<path ${decomposition ? 'data-deflection="total"' : ""} d="${poly(pts)}" fill="none" stroke="${o.blue}" stroke-width="2.1"/>`;
      if (!symbolic) {
        const peak = stations.reduce((a, b) => (Math.abs(a.value) > Math.abs(b.value) ? a : b));
        if (Math.abs(peak.value) > 1e-9) {
          const px = X(peak.x),
            anchor = peak.x < m.length * 0.13 ? "start" : peak.x > m.length * 0.87 ? "end" : "middle";
          const labelX = px + (anchor === "start" ? 5 : anchor === "end" ? -5 : 0);
          if (
            !labelled.some(
              (p) =>
                Math.abs(p.x - px) < 8 && Math.abs(p.value - peak.value) < 1e-6 * Math.max(1, Math.abs(peak.value)),
            )
          ) {
            body += label(
              labelX,
              Y(peak.value) +
                (peak.value >= 0 ? -10 : small + 8) +
                (result.members.length > 3 ? (memberIndex % 2) * (small + 7) * (peak.value >= 0 ? -1 : 1) : 0),
              fmt(peak.value * factor),
              o.ink,
              small,
              anchor,
            );
            labelled.push({ x: px, value: peak.value });
          }
        }
      }
      if (!compact) body += label(offset + len / 2, top + row - 7, memberName(model, m.id), o.sub, small, "middle");
      body += ln(offset, top + 6, offset, top + row - 9, o.line, 'stroke-dasharray="3 4" opacity=".5"');
      offset += len;
    }
    body += ln(o.right, top + 6, o.right, top + row - 9, o.line, 'stroke-dasharray="3 4" opacity=".5"');
    top += row;
    body += ln(0, top - 1, o.width, top - 1, o.line, 'opacity=".45"');
  }
  if (hasSplit) {
    let x = 12;
    for (const [name, color, dash] of [
      ["Total", o.blue, ""],
      ["Bending", o.sub, "6 4"],
      ["Shear increment", "#b97d23", "2 4"],
    ]) {
      body +=
        ln(x, top + 18, x + 24, top + 18, color, `stroke-width="2" stroke-dasharray="${dash}"`) +
        label(x + 32, top + 22, name, o.sub, smallFont(f));
      x += 44 + name.length * smallFont(f) * 0.56;
    }
    top += 33;
  }
  if (!compact && top) {
    const lines = wrapLabel("Independent scales; displacement exaggerated", o.width - 24, smallFont(f));
    lines.forEach(
      (value, i) => (body += label(12, top + smallFont(f) + 8 + i * (smallFont(f) + 6), value, o.sub, smallFont(f))),
    );
    top += lines.length * (smallFont(f) + 6) + 14;
  }
  return { body, height: Math.max(1, top) };
}
