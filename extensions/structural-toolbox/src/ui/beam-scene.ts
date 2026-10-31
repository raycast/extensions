import { diagramLayout } from "../core/diagram-layout";
import { smallFont, wrapLabel } from "./visual-style";
import { Model, Result } from "../core/types";
import { fmt } from "./state";
import { reactionVector, rotationVector } from "../core/diagram-vectors";

export interface SceneOptions {
  width: number;
  left: number;
  right: number;
  font: number;
  ink: string;
  sub: string;
  blue: string;
  bg: string;
  line: string;
  green?: string;
  symbolic?: boolean;
  showLoads?: boolean;
  showReactions?: boolean;
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export function beamScene(model: Model, result: Result | undefined, o: SceneOptions) {
  const f = o.font,
    small = smallFont(f),
    layout = diagramLayout(model, o.left, o.right);
  const { minX, maxX, minZ, maxZ, base, X, Y } = layout;
  const inclined = maxZ - minZ > 1;
  const showReactions = o.showReactions !== false && !!result;
  const supports = model.nodes.filter((n) => n.restraints.some(Boolean));
  const crowded = supports.length > 3;
  const commonUDL =
    !inclined &&
    model.members.length > 2 &&
    model.memberLoads.length === model.members.length &&
    model.members.every((m) => {
      const entries = model.memberLoads.filter((l) => l.member === m.id),
        a = model.nodes.find((n) => n.id === m.start)!,
        b = model.nodes.find((n) => n.id === m.end)!,
        l = entries[0],
        first = model.memberLoads[0];
      return (
        entries.length === 1 &&
        l.kind === "udl" &&
        l.magnitude === first.magnitude &&
        l.direction === first.direction &&
        l.basis === first.basis &&
        (l.endMagnitude === undefined || l.endMagnitude === l.magnitude) &&
        !l.start &&
        (l.end === undefined || Math.abs(l.end - Math.hypot(b.x - a.x, b.z - a.z)) < 1e-6)
      );
    });
  const footerLabels: string[] = [];
  const loads = model.memberLoads.filter((l) => l.kind !== "moment");
  if (loads.length) {
    const names = [
      ...new Set(
        loads.map((l) =>
          l.direction === "globalZ"
            ? l.magnitude <= 0
              ? "Global down"
              : "Global up"
            : l.direction === "globalX"
              ? l.magnitude <= 0
                ? "Global left"
                : "Global right"
              : l.direction === "localZ"
                ? l.magnitude <= 0
                  ? "Local -z; normal to member"
                  : "Local +z; normal to member"
                : "Local axial load",
        ),
      ),
    ];
    footerLabels.push(names.length === 1 ? names[0] : "Mixed load directions");
    const udls = loads.filter((l) => l.kind === "udl");
    if (udls.length)
      footerLabels.push(
        udls.every((l) => l.basis === "projected")
          ? "UDL per horizontal metre"
          : udls.every((l) => l.basis === "member")
            ? "UDL per member metre"
            : "Mixed UDL bases",
      );
  }
  const reactionHeight = showReactions ? (crowded ? 190 : 150) : 65;
  const footerY = base + reactionHeight;
  const footerLines = footerLabels.flatMap((value) => wrapLabel(value, o.right - o.left, small));
  const height = footerY + (footerLines.length ? footerLines.length * (small + 7) + 14 : 10);
  const label = (x: number, y: number, s: string, color = o.ink, size = small, anchor = "middle") =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" style="font-size:${size}px;fill:${color}">${esc(s)}</text>`;
  const ln = (x: number, y: number, X: number, Y: number, c = o.line, w = 1) =>
    `<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}"/>`;
  const arrow = (x: number, y: number, fx: number, fz: number, c: string, length = 23) => {
    const v = reactionVector(x, y, fx, fz, length);
    if (!v) return "";
    return ln(x, y, v.tipX, v.tipY, c, 1.7) + `<path d="${v.head}" fill="none" stroke="${c}" stroke-width="1.7"/>`;
  };
  const moment = (x: number, y: number, m: number, c: string, r = 18) => {
    const v = rotationVector(x, y, m, r);
    if (!v) return "";
    return `<g data-reaction-rotation="${m > 0 ? "counterclockwise" : "clockwise"}"><path d="${v.arc}" fill="none" stroke="${c}" stroke-width="1.7"/><path d="${v.head}" fill="none" stroke="${c}" stroke-width="1.7"/></g>`;
  };
  let body = `<g data-geometry-scale="${layout.scale}" data-pitch="${layout.pitch}"></g>`;
  if (inclined)
    body += label(o.right, small + 7, "Pitch " + fmt(layout.pitch) + "°", o.blue, Math.max(20, small), "end");
  if (commonUDL && o.showLoads !== false)
    body += label(
      (o.left + o.right) / 2,
      base - 46,
      (o.symbolic ? "q" : fmt(Math.abs(model.memberLoads[0].magnitude)) + " kN/m") + " on all spans",
      o.blue,
      small + 1,
    );

  for (const m of model.members) {
    const a = model.nodes.find((n) => n.id === m.start)!,
      b = model.nodes.find((n) => n.id === m.end)!;
    const dx = b.x - a.x,
      dz = b.z - a.z,
      L = Math.hypot(dx, dz),
      co = dx / L,
      si = dz / L;
    body += ln(X(a.x), Y(a.z), X(b.x), Y(b.z), o.ink, 2.2);
    if (m.releaseStart || m.releaseEnd)
      for (const [n, on] of [
        [a, m.releaseStart],
        [b, m.releaseEnd],
      ] as const)
        if (on) body += `<circle cx="${X(n.x)}" cy="${Y(n.z)}" r="3.3" fill="${o.bg}" stroke="${o.ink}"/>`;
    if (o.showLoads !== false)
      for (const load of model.memberLoads.filter((l) => l.member === m.id)) {
        const at =
          load.kind === "point" || load.kind === "moment"
            ? (load.position ?? L / 2) / L
            : ((load.start ?? 0) + (load.end ?? L)) / (2 * L);
        const lx = X(a.x + dx * at),
          ly = Y(a.z + dz * at);
        if (load.kind === "moment") {
          body +=
            moment(lx, ly, load.magnitude, o.blue, 14) +
            label(lx + 20, ly - 20, o.symbolic ? "M" : fmt(Math.abs(load.magnitude) / 1e6) + " kN·m", o.blue);
          continue;
        }
        const ux =
          load.direction === "globalX" ? 1 : load.direction === "globalZ" ? 0 : load.direction === "localX" ? co : -si;
        const uz =
          load.direction === "globalZ" ? 1 : load.direction === "globalX" ? 0 : load.direction === "localX" ? si : co;
        const count = load.kind === "point" ? 1 : Math.max(3, Math.min(9, Math.round(Math.abs(X(b.x) - X(a.x)) / 50)));
        for (let j = 0; j < count; j++) {
          // UDL samples are inside the loaded interval, leaving support reaction lanes clear.
          const ratio = count === 1 ? 0 : (j + 0.5) / count;
          const t = count === 1 ? at : ((load.start ?? 0) + ((load.end ?? L) - (load.start ?? 0)) * ratio) / L;
          const mag = load.magnitude + ((load.endMagnitude ?? load.magnitude) - load.magnitude) * ratio;
          if (Math.abs(mag) < 1e-12) continue;
          const len =
            (25 * Math.abs(mag)) /
            Math.max(Math.abs(load.magnitude), Math.abs(load.endMagnitude ?? load.magnitude), 1e-12);
          const vx = ux * Math.sign(mag),
            vz = uz * Math.sign(mag),
            px = X(a.x + dx * t),
            py = Y(a.z + dz * t);
          body += arrow(px - vx * len, py + vz * len, vx, vz, o.blue, len);
        }
        const value = o.symbolic
          ? load.kind === "point"
            ? "P"
            : "q"
          : fmt(Math.abs(load.magnitude) / (load.kind === "point" ? 1000 : 1)) +
            (load.endMagnitude !== undefined && load.endMagnitude !== load.magnitude
              ? " to " + fmt(Math.abs(load.endMagnitude))
              : "") +
            (load.kind === "point" ? " kN" : " kN/m");
        if (!commonUDL) body += label(lx, ly - 38, value, o.blue, small + 1);
      }
  }
  if (o.showLoads !== false)
    for (const load of model.nodalLoads) {
      const n = model.nodes.find((n) => n.id === load.node)!,
        v = Math.hypot(load.fx, load.fz);
      if (v > 1e-7) {
        body += arrow(X(n.x) - (load.fx / v) * 25, Y(n.z) + (load.fz / v) * 25, load.fx, load.fz, o.blue, 25);
        body += label(X(n.x), Y(n.z) - 38, o.symbolic ? "P" : fmt(v / 1000) + " kN", o.blue);
      }
      if (Math.abs(load.moment) > 1e-3)
        body +=
          moment(X(n.x), Y(n.z), load.moment, o.blue, 13) +
          label(
            X(n.x) + 22,
            Y(n.z) - 21,
            o.symbolic ? "M" : fmt(Math.abs(load.moment) / 1e6) + " kN·m",
            o.blue,
            small,
            "start",
          );
    }
  const green = o.green || "#48a779";
  for (const n of model.nodes) {
    const x = X(n.x),
      y = Y(n.z),
      right = n.x >= (minX + maxX) / 2;
    if (n.restraints[2]) {
      if (!n.restraints[1])
        body += label(x + (right ? -18 : 18), y - 8, "Z free", o.sub, small, right ? "end" : "start");
      body += ln(x, y - 10, x, y + 12, o.ink, 2);
      for (let k = 0; k < 5; k++) body += ln(x, y - 10 + k * 5, x + (right ? 6 : -6), y - 6 + k * 5, o.sub);
    } else if (n.restraints.some(Boolean)) {
      body += `<path d="M${x},${y + 1} l-6,10 h12 Z" fill="${o.bg}" stroke="${o.ink}"/>`;
      if (!n.restraints[0]) body += ln(x - 8, y + 14, x + 8, y + 14);
    }
    body += label(
      x + (right ? -8 : 8),
      y + (n.restraints.some(Boolean) ? 29 : -12),
      n.id,
      o.sub,
      small,
      right ? "end" : "start",
    );
    if (o.showReactions !== false && result && n.restraints.some(Boolean)) {
      const [fx, fz, m] = result.reactions[n.id] || [0, 0, 0];
      const anchor = right ? "end" : "start",
        side = right ? -1 : 1;
      const index = supports.indexOf(n),
        stagger = crowded ? (index % 2) * 36 : 0;
      const reactionFont = Math.max(20, small);
      // All forces stay at their support. Crowded values use two rows and a separate unit line.
      if (Math.abs(fz) > 1e-5) {
        const tailY = fz > 0 ? y + 76 : y + 44;
        body +=
          `<g data-reaction-node="${esc(n.id)}" data-reaction-force="vertical" data-direction="${fz > 0 ? "up" : "down"}">` +
          arrow(x, tailY, 0, fz, green, 32) +
          label(
            crowded ? x : x + side * 9,
            y + (crowded ? 104 + stagger : 76),
            o.symbolic ? "R" + n.id : fmt(Math.abs(fz) / 1000) + (crowded ? "" : " kN"),
            green,
            reactionFont,
            crowded ? "middle" : anchor,
          ) +
          (crowded && !o.symbolic ? label(x, y + 129 + stagger, "kN", green, small) : "") +
          "</g>";
      }
      if (Math.abs(fx) > 1e-5) {
        const tailX = x + (fx > 0 ? -16 : 16);
        body +=
          `<g data-reaction-node="${esc(n.id)}" data-reaction-force="horizontal" data-direction="${fx > 0 ? "right" : "left"}">` +
          arrow(tailX, y + 116, fx, 0, green, 32) +
          label(
            x + side * 24,
            y + 123,
            o.symbolic ? "H" + n.id : fmt(Math.abs(fx) / 1000) + " kN",
            green,
            reactionFont,
            anchor,
          ) +
          "</g>";
      }
      if (Math.abs(m) > 1e-3) {
        body +=
          `<g data-reaction-node="${esc(n.id)}">` +
          moment(x, y, m, green) +
          label(
            x,
            y - 40,
            o.symbolic ? "M" + n.id : fmt(Math.abs(m) / 1e6) + " kN·m",
            green,
            Math.max(20, small),
            right ? "end" : "start",
          ) +
          "</g>";
      }
    }
  }
  // Span dimensions occupy the middle, independent of support labels.
  if (inclined) {
    body += label((o.left + o.right) / 2, base + 31, fmt((maxX - minX) / 1000) + " m horizontal", o.sub);
  } else
    for (const m of model.members) {
      const a = model.nodes.find((n) => n.id === m.start)!,
        b = model.nodes.find((n) => n.id === m.end)!;
      body += label(
        (X(a.x) + X(b.x)) / 2,
        base + (crowded ? 56 : 33),
        o.symbolic ? "L" : fmt(Math.abs(b.x - a.x) / 1000) + " m",
        o.sub,
      );
    }
  footerLines.forEach((value, i) => {
    body += label((o.left + o.right) / 2, footerY + (i + 1) * (small + 7), value, o.sub, small);
  });
  return {
    body: "<!-- beam-scene-start -->" + body + "<!-- beam-scene-end -->",
    height,
    plotLeft: layout.left,
    plotRight: layout.right,
  };
}
