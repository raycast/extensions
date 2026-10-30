import { BLUE, circle, line, P, path, poly, Pt, reticle } from "./hud";
import { callout, ground } from "./hud-scenes";
import { hash } from "./util";

const rad = (deg: number) => (deg * Math.PI) / 180;

interface Overlay {
  /** Enemy health bar fill per frame. */
  hp: number[];
  boss?: boolean;
  label: string;
  /** The point the target lock sits on, and the point the label's leader line starts from. */
  lock: Pt;
  lockR: number;
  from: Pt;
  /** Radar blips as [angle, distance 0..1]. */
  blips: [number, number][];
}

function radar(f: number, blips: [number, number][]): string {
  const c: Pt = [520, 296];
  const r = 42;
  const sweep = rad(f * 90 - 90);
  let out = circle(c, r, BLUE.pale, 1.4, "#0b1e44", 'fill-opacity=".7"');
  out += circle(c, r * 0.66, BLUE.mid, 0.9) + circle(c, r * 0.33, BLUE.mid, 0.9);
  out +=
    line([c[0] - r, c[1]], [c[0] + r, c[1]], BLUE.mid, 0.8) +
    line([c[0], c[1] - r], [c[0], c[1] + r], BLUE.mid, 0.8);
  const a0 = sweep - rad(50);
  out += `<path d="M${P(c)}L${P([c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r])}A${r} ${r} 0 0 1 ${P([c[0] + Math.cos(sweep) * r, c[1] + Math.sin(sweep) * r])}Z" fill="${BLUE.light}" opacity=".3"/>`;
  out += line(c, [c[0] + Math.cos(sweep) * r, c[1] + Math.sin(sweep) * r], "#ffffff", 1.4);
  for (const [a, d] of blips) {
    const ang = rad(a);
    const p: Pt = [c[0] + Math.cos(ang) * d * r, c[1] + Math.sin(ang) * d * r];
    const near = Math.abs(((((a - (f * 90 - 90)) % 360) + 540) % 360) - 180) < 70;
    out += circle(p, near ? 3.4 : 2.4, BLUE.pale, 1, BLUE.pale, `opacity="${near ? 1 : 0.55}"`);
  }
  return out;
}

function hpBar(frac: number, boss: boolean): string {
  const x = 190;
  const y = boss ? 56 : 60;
  const w = 260;
  const h = boss ? 12 : 8;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${BLUE.pale}" stroke-width="1.4"/>`;
  out += `<rect x="${x}" y="${y}" width="${(w * frac).toFixed(1)}" height="${h}" fill="${BLUE.light}" opacity=".9"/>`;
  if (boss) {
    for (let i = 1; i < 5; i++)
      out += line([x + (w * i) / 5, y], [x + (w * i) / 5, y + h], BLUE.bg, 1.4);
    out += path(`M${x - 8} ${y - 2}v${h + 4}h8M${x + w + 8} ${y - 2}v${h + 4}h-8`, BLUE.pale, 1.4);
  }
  return out;
}

function strike(c: Pt, f: number): string {
  if (f !== 2) return `<circle cx="${c[0]}" cy="${c[1]}" r="8" fill="url(#flare)" opacity=".5"/>`;
  let out = `<circle cx="${c[0]}" cy="${c[1]}" r="26" fill="url(#flare)"/>`;
  for (let i = 0; i < 9; i++) {
    const a = rad(i * 40 + 10);
    out += line(
      [c[0] + Math.cos(a) * 8, c[1] + Math.sin(a) * 8],
      [c[0] + Math.cos(a) * (22 + (i % 3) * 8), c[1] + Math.sin(a) * (22 + (i % 3) * 8)],
      "#ffffff",
      1.6,
    );
  }
  return out;
}

function overlay(f: number, o: Overlay, hit: Pt): string {
  return [
    strike(hit, f),
    reticle(o.lock, o.lockR + (f % 2) * 2, f),
    hpBar(o.hp[f], o.boss ?? false),
    radar(f, o.blips),
    callout(o.from, [452, 122], o.label),
  ].join("");
}

function cave(f: number): string {
  let out = "";
  for (let i = 0; i < 11; i++) {
    const x = 70 + i * 50 + (hash(i, 1, 101) - 0.5) * 20;
    // keep the middle of the ceiling short so it stays clear of the health bar
    const h = x > 170 && x < 470 ? 4 + hash(i, 2, 101) * 8 : 24 + hash(i, 2, 101) * 54;
    out += poly(
      [
        [x - 16, 38],
        [x + 16, 38],
        [x + (hash(i, 3, 101) - 0.5) * 6, 38 + h],
      ],
      "url(#hull)",
      BLUE.mid,
      1,
      'fill-opacity=".7"',
    );
  }
  let floor = "M18 306";
  for (let x = 18; x <= 622; x += 24)
    floor += `L${x} ${Math.round(304 + Math.sin(x / 31) * 4 + hash(x, 4, 101) * 5)}`;
  out += path(`${floor}L622 396L18 396Z`, "none", 0, BLUE.bg);
  out += path(floor, BLUE.mid, 1.3);
  for (let i = 0; i < 5; i++) {
    out += path(
      `M${80 + i * 20} ${322 + i * 12}Q${300} ${316 + i * 12 + (f % 2)} ${560 - i * 24} ${322 + i * 12}`,
      BLUE.line,
      0.9,
      "none",
      `opacity="${0.6 - i * 0.08}"`,
    );
  }
  return out;
}

// --- creature parts ----------------------------------------------------------------

const hull = (points: Pt[], stroke: string = BLUE.pale, w = 1.5) =>
  poly(points, "url(#hull)", stroke, w);

/** A jointed leg from a hip to the ground, swinging with the frame. */
function leg(
  hip: Pt,
  reach: number,
  drop: number,
  f: number,
  phase: number,
  dir = 1,
  w = 2,
): string {
  const swing = Math.sin(rad(f * 90 + phase)) * 9;
  const knee: Pt = [hip[0] + dir * reach * 0.6 + swing * 0.5, hip[1] + drop * 0.45 - 8];
  const foot: Pt = [hip[0] + dir * reach + swing, hip[1] + drop];
  return (
    path(`M${P(hip)}L${P(knee)}L${P(foot)}`, BLUE.pale, w) +
    circle(knee, 2.4, BLUE.pale, 1, BLUE.bg)
  );
}

function ellipse(
  c: Pt,
  rx: number,
  ry: number,
  stroke: string = BLUE.pale,
  w = 1.5,
  rot = 0,
): string {
  return `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${rx}" ry="${ry}" fill="url(#hull)" stroke="${stroke}" stroke-width="${w}" transform="rotate(${rot} ${c[0]} ${c[1]})"/>`;
}

function eye(c: Pt, r = 3): string {
  return circle(c, r, "#ffffff", 1, "#ffffff");
}

/** A four-legged hunter facing right, shared by the Cave Stalker and the Rift Hound. */
function quadruped(
  cx: number,
  by: number,
  f: number,
  o: { bulk: number; leg: number; spines: boolean; jaw: number },
): string {
  const bodyY = by - o.leg - o.bulk * 0.6;
  let out = "";
  // far legs first, dimmer
  out +=
    leg([cx - 34, bodyY + 6], 14, o.leg, f, 180, -1, 1.5) +
    leg([cx + 34, bodyY + 6], 14, o.leg, f, 0, 1, 1.5);
  out += path(
    `M${cx - o.bulk * 1.2} ${bodyY}Q${cx - o.bulk * 2.2} ${bodyY - 18} ${cx - o.bulk * 2.7} ${bodyY + 14 + (f % 2) * 4}`,
    BLUE.pale,
    2.4,
  );
  out += ellipse([cx, bodyY], o.bulk * 1.25, o.bulk * 0.62);
  if (o.spines) {
    for (let i = -3; i <= 3; i++)
      out += poly(
        [
          [cx + i * 14 - 6, bodyY - o.bulk * 0.55],
          [cx + i * 14, bodyY - o.bulk * 0.55 - 14 - (i % 2) * 6],
          [cx + i * 14 + 6, bodyY - o.bulk * 0.55],
        ],
        BLUE.light,
        BLUE.pale,
        1,
      );
  }
  const hx = cx + o.bulk * 1.2;
  out += hull([
    [hx - 6, bodyY - 20],
    [hx + 52, bodyY - 6],
    [hx + 48, bodyY + 8 + o.jaw * 0.2],
    [hx - 4, bodyY + 20],
  ]);
  out += hull([
    [hx + 6, bodyY + 12],
    [hx + 46, bodyY + 10 + o.jaw],
    [hx + 38, bodyY + 18 + o.jaw],
    [hx, bodyY + 22],
  ]);
  for (let i = 0; i < 4; i++)
    out += poly(
      [
        [hx + 24 + i * 6, bodyY + 8 + o.jaw * 0.3],
        [hx + 27 + i * 6, bodyY + 14 + o.jaw * 0.5],
        [hx + 30 + i * 6, bodyY + 8 + o.jaw * 0.3],
      ],
      BLUE.pale,
      BLUE.pale,
      0.6,
    );
  out += eye([hx + 22, bodyY - 8]);
  out +=
    leg([cx - 24, bodyY + 12], 12, o.leg, f, 90, -1, 2.4) +
    leg([cx + 28, bodyY + 12], 12, o.leg, f, 270, 1, 2.4);
  return out;
}

// --- the fights --------------------------------------------------------------------

export function skitter(f: number): string {
  const y = 250;
  let dust = "";
  for (let i = 0; i < 6; i++) {
    const phase = ((f + i * 0.7) % 4) / 4;
    dust += circle(
      [236 - phase * 50 + i * 4, 302 - phase * 12],
      2 + phase * 4,
      BLUE.light,
      1,
      "none",
      `opacity="${(0.7 - phase * 0.6).toFixed(2)}"`,
    );
  }
  const body = [
    leg([262, y + 10], 22, 44, f, 0, -1),
    leg([292, y + 12], 20, 42, f, 120, -1),
    leg([322, y + 10], 22, 44, f, 240, -1),
    leg([272, y + 14], 20, 40, f, 180, 1, 2.6),
    leg([302, y + 16], 18, 38, f, 300, 1, 2.6),
    leg([332, y + 14], 20, 40, f, 60, 1, 2.6),
    ellipse([250, y + 2], 34, 22),
    ellipse([300, y], 38, 24),
    ellipse([350, y - 4], 22, 16),
    path(`M368 ${y} q16 ${6 + (f % 2) * 3} 20 22 M366 ${y + 6} q10 12 4 24`, BLUE.pale, 2.2),
    eye([358, y - 8]),
    eye([348, y - 11], 2.4),
  ].join("");
  return [ground(), dust, body].join("");
}

export function burrower(f: number): string {
  const c: Pt = [310, 300];
  let sand = "";
  for (let i = 0; i < 3; i++) {
    sand += `<ellipse cx="${c[0]}" cy="${c[1] + 6}" rx="${60 + i * 46 + (f % 2) * 4}" ry="${10 + i * 7}" fill="none" stroke="${BLUE.light}" stroke-width="1.2" stroke-dasharray="10 6" opacity="${0.8 - i * 0.2}"/>`;
  }
  const sway = Math.sin(rad(f * 90)) * 7;
  let seg = "";
  for (let i = 0; i < 9; i++) {
    const y = 296 - i * 18;
    const x = c[0] + sway * (i / 8);
    const w = 34 - i * 0.9;
    seg += `<ellipse cx="${x.toFixed(1)}" cy="${y}" rx="${w}" ry="9" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.4"/>`;
  }
  const top: Pt = [c[0] + sway, 136];
  let teeth = "";
  for (let i = 0; i < 12; i++) {
    const a = rad(i * 30);
    teeth += poly(
      [
        [top[0] + Math.cos(a - 0.12) * 24, top[1] + Math.sin(a - 0.12) * 9],
        [top[0] + Math.cos(a) * 11, top[1] + Math.sin(a) * 4],
        [top[0] + Math.cos(a + 0.12) * 24, top[1] + Math.sin(a + 0.12) * 9],
      ],
      BLUE.pale,
      BLUE.pale,
      0.6,
    );
  }
  let spray = "";
  for (let i = 0; i < 14; i++) {
    const phase = ((f + hash(i, 1, 102) * 4) % 4) / 4;
    spray += circle(
      [
        c[0] + (hash(i, 2, 102) - 0.5) * 140 * phase,
        292 - 60 * phase + 120 * phase * phase * 0.5 - hash(i, 3, 102) * 20,
      ],
      1.4 + hash(i, 4, 102) * 2,
      BLUE.pale,
      1,
      "none",
      `opacity="${(1 - phase * 0.7).toFixed(2)}"`,
    );
  }
  return [
    ground(),
    sand,
    seg,
    `<ellipse cx="${top[0]}" cy="${top[1]}" rx="30" ry="12" fill="#0b1e44" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    `<ellipse cx="${top[0]}" cy="${top[1]}" rx="18" ry="6" fill="${BLUE.light}" opacity=".35"/>`,
    teeth,
    spray,
  ].join("");
}

export function stalker(f: number): string {
  const heat = `<circle cx="296" cy="244" r="${(90 + f * 4).toFixed(1)}" fill="url(#flare)" opacity=".3"/><circle cx="296" cy="244" r="58" fill="url(#flare)" opacity=".35"/>`;
  return [
    cave(f),
    heat,
    quadruped(296, 306, f, { bulk: 36, leg: 52, spines: true, jaw: [6, 12, 20, 12][f] }),
  ].join("");
}

export function leech(f: number): string {
  const centre: Pt[] = [];
  const edge: { top: Pt[]; bottom: Pt[] } = { top: [], bottom: [] };
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const x = 150 + 250 * t;
    const y = 250 - 30 * Math.sin(t * 4.6 + f * 0.7) - 40 * t;
    const w = 6 + 24 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.6);
    centre.push([x, y]);
    edge.top.push([x, y - w]);
    edge.bottom.push([x, y + w]);
  }
  let rings = "";
  for (let i = 2; i < 25; i += 2)
    rings += line(edge.top[i], edge.bottom[i], BLUE.mid, 1, 'opacity=".8"');
  const head = centre[26];
  let sucker = circle(head, 20, BLUE.pale, 1.6, "#0b1e44") + circle(head, 11, BLUE.light, 1.2);
  for (let i = 0; i < 10; i++) {
    const a = rad(i * 36);
    sucker += line(
      [head[0] + Math.cos(a) * 20, head[1] + Math.sin(a) * 20],
      [head[0] + Math.cos(a) * 12, head[1] + Math.sin(a) * 12],
      BLUE.pale,
      1.2,
    );
  }
  const lureTop: Pt = [head[0] - 28, head[1] - 74 + (f % 2) * 3];
  const lure = [
    path(
      `M${head[0] - 14} ${head[1] - 18}Q${head[0] - 44} ${head[1] - 50} ${P(lureTop)}`,
      BLUE.pale,
      2,
    ),
    `<circle cx="${lureTop[0]}" cy="${lureTop[1]}" r="${(26 + f * 3).toFixed(1)}" fill="url(#flare)"/>`,
    circle(lureTop, 5, "#ffffff", 1, "#ffffff"),
  ].join("");
  const drops = [0, 1, 2]
    .map((i) =>
      circle(
        [head[0] + 6 + i * 4, head[1] + 24 + ((f + i * 1.3) % 4) * 12],
        2.4,
        BLUE.pale,
        1,
        BLUE.pale,
      ),
    )
    .join("");
  return [
    cave(f),
    `<polygon points="${[...edge.top, ...edge.bottom.reverse()].map(P).join(" ")}" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.6" stroke-linejoin="round"/>`,
    rings,
    sucker,
    lure,
    drops,
  ].join("");
}

export function wraith(f: number): string {
  const cx = 310;
  let echoes = "";
  for (let k = 3; k >= 0; k--) {
    const dx = (k - 1.5) * 9 + Math.sin(rad(f * 90 + k * 50)) * 5;
    let d = `M${cx - 30 + dx} 150Q${cx + dx} 120 ${cx + 30 + dx} 150L${cx + 56 + dx} 250`;
    for (let i = 0; i <= 6; i++)
      d += `L${cx + 56 - i * 18.7 + dx} ${296 + (i % 2 ? 14 : -4) + Math.sin(rad(f * 90 + i * 60)) * 5}`;
    d += `L${cx - 56 + dx} 250Z`;
    echoes += path(
      d,
      BLUE.pale,
      k === 1 ? 1.8 : 1,
      k === 1 ? "url(#hull)" : "none",
      `opacity="${k === 1 ? 1 : 0.3}"`,
    );
  }
  const head = [
    `<ellipse cx="${cx}" cy="162" rx="18" ry="24" fill="#0b1e44" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    `<ellipse cx="${cx - 7}" cy="158" rx="3.4" ry="6" fill="#ffffff"/>`,
    `<ellipse cx="${cx + 7}" cy="158" rx="3.4" ry="6" fill="#ffffff"/>`,
  ].join("");
  let arms = "";
  for (const s of [-1, 1]) {
    arms += path(
      `M${cx + s * 40} 196q${s * 40} ${20 + Math.sin(rad(f * 90)) * 6} ${s * 72} ${60 + (f % 2) * 6}`,
      BLUE.pale,
      2,
    );
    for (let i = 0; i < 3; i++)
      arms += line(
        [cx + s * (112 - i * 3), 262 + (f % 2) * 6 + i * 3],
        [cx + s * (126 - i * 3), 276 + i * 6],
        BLUE.pale,
        1.4,
      );
  }
  let shards = "";
  for (let i = 0; i < 10; i++) {
    const phase = ((f + hash(i, 1, 103) * 4) % 4) / 4;
    const p: Pt = [cx - 110 + hash(i, 2, 103) * 220, 290 - phase * 150];
    shards += poly(
      [
        [p[0], p[1] - 5],
        [p[0] + 3, p[1] + 3],
        [p[0] - 3, p[1] + 3],
      ],
      BLUE.light,
      BLUE.pale,
      0.8,
      `opacity="${(0.9 - phase * 0.7).toFixed(2)}"`,
    );
  }
  return [ground(), echoes, head, arms, shards].join("");
}

export function hound(f: number): string {
  const portal: Pt = [400, 170];
  let tear = `<circle cx="${portal[0]}" cy="${portal[1]}" r="${(60 + f * 3).toFixed(1)}" fill="url(#flare)" opacity=".55"/>`;
  for (let i = 0; i < 12; i++) {
    const a = rad(i * 30 + f * 4);
    const r1 = 40 + hash(i, 1, 104) * 20;
    const r2 = r1 + 20 + hash(i, 2, 104) * 30;
    tear += line(
      [portal[0] + Math.cos(a) * r1, portal[1] + Math.sin(a) * r1 * 1.3],
      [portal[0] + Math.cos(a + 0.12) * r2, portal[1] + Math.sin(a + 0.12) * r2 * 1.3],
      BLUE.pale,
      1.4,
    );
  }
  let shards = "";
  for (let i = 0; i < 12; i++) {
    const phase = ((f + hash(i, 3, 104) * 4) % 4) / 4;
    const p: Pt = [
      250 + hash(i, 4, 104) * 180 + phase * 20,
      200 + hash(i, 5, 104) * 90 - phase * 24,
    ];
    shards += poly(
      [
        [p[0], p[1] - 6],
        [p[0] + 5, p[1] + 4],
        [p[0] - 5, p[1] + 3],
      ],
      BLUE.light,
      BLUE.pale,
      0.8,
      `opacity="${(0.9 - phase * 0.6).toFixed(2)}"`,
    );
  }
  return [
    ground(),
    tear,
    quadruped(290, 306, f, { bulk: 28, leg: 64, spines: false, jaw: [10, 18, 24, 18][f] }),
    shards,
  ].join("");
}

export function matriarch(f: number): string {
  const pulse = [0, 2, 4, 2][f];
  let eggs = "";
  for (let i = 0; i < 7; i++) {
    eggs += circle(
      [176 + (i % 4) * 34 + (i > 3 ? 16 : 0), 224 + Math.floor(i / 4) * 30],
      9 + (i % 2) * pulse * 0.4,
      BLUE.pale,
      1.1,
      BLUE.light,
      'fill-opacity=".35"',
    );
  }
  let crown = "";
  for (let i = 0; i < 5; i++) {
    const x = 366 + i * 12;
    crown += poly(
      [
        [x - 5, 168],
        [x + 1, 128 - i * 4 + (i === 2 ? -10 : 0)],
        [x + 6, 168],
      ],
      BLUE.light,
      BLUE.pale,
      1.2,
    );
  }
  const legs = [
    leg([300, 240], 34, 64, f, 0, -1, 3),
    leg([330, 244], 34, 60, f, 120, 1, 3),
    leg([270, 246], 40, 58, f, 240, -1, 3),
    leg([356, 240], 34, 62, f, 60, 1, 3),
  ].join("");
  let brood = "";
  for (let i = 0; i < 3; i++) {
    const x = 120 + i * 40 + ((f * 6 + i * 20) % 30);
    brood +=
      ellipse([x, 296], 9, 5, BLUE.light, 1) +
      line([x - 6, 300], [x - 10, 306], BLUE.light, 1) +
      line([x + 6, 300], [x + 10, 306], BLUE.light, 1);
  }
  return [
    ground(),
    legs,
    ellipse([220, 232], 92, 54),
    eggs,
    ellipse([326, 206], 48, 34),
    ellipse([388, 196], 26, 22),
    crown,
    eye([398, 190], 3.4),
    eye([384, 186], 2.6),
    path(`M404 206q16 ${8 + (f % 2) * 4} 16 28M398 212q10 14 0 28`, BLUE.pale, 2.4),
    brood,
  ].join("");
}

export function broodking(f: number): string {
  const open = [14, 24, 8, 24][f];
  const claw = (x: number, s: number) => {
    const base: Pt = [x, 220];
    const elbow: Pt = [x + s * 56, 160];
    const wrist: Pt = [x + s * 78, 122];
    return [
      path(`M${P(base)}L${P(elbow)}L${P(wrist)}`, BLUE.pale, 6),
      circle(elbow, 6, BLUE.pale, 1.4, BLUE.bg),
      hull([
        [wrist[0] - 14, wrist[1]],
        [wrist[0] + s * 8, wrist[1] - 60 - open * 0.4],
        [wrist[0] + s * 22, wrist[1] - 10],
        [wrist[0] + 14, wrist[1] + 8],
      ]),
      hull([
        [wrist[0] - 8, wrist[1] + 6],
        [wrist[0] + s * (26 + open), wrist[1] - 34],
        [wrist[0] + s * 28, wrist[1] + 6],
      ]),
    ].join("");
  };
  let spines = "";
  for (let i = -4; i <= 4; i++)
    spines += poly(
      [
        [320 + i * 20 - 6, 182 - Math.abs(i) * 2],
        [320 + i * 20, 160 - (4 - Math.abs(i)) * 5],
        [320 + i * 20 + 6, 182 - Math.abs(i) * 2],
      ],
      BLUE.light,
      BLUE.pale,
      1,
    );
  const legs = [-1, 1]
    .map(
      (s) =>
        leg([320 + s * 60, 262], 52 * s * s, 44, f, s > 0 ? 0 : 180, s, 3.4) +
        leg([320 + s * 30, 270], 30 * s * s, 36, f, s > 0 ? 90 : 270, s, 3),
    )
    .join("");
  return [
    cave(f),
    legs,
    `<path d="M200 262Q210 170 320 164Q430 170 440 262Z" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.8"/>`,
    path("M240 250Q250 196 320 188Q390 196 400 250M280 252V190M360 252V190", BLUE.mid, 1.2),
    spines,
    claw(214, -1),
    claw(426, 1),
    line([300, 170], [290, 142], BLUE.pale, 2.4),
    line([340, 170], [352, 142], BLUE.pale, 2.4),
    eye([289, 140], 4.4),
    eye([353, 140], 4.4),
  ].join("");
}

export function sovereign(f: number): string {
  const c: Pt = [320, 214];
  let rings = "";
  for (const [r, k] of [
    [120, 1],
    [86, -1],
    [54, 1],
  ] as const) {
    rings += `<circle cx="${c[0]}" cy="${c[1]}" r="${r}" fill="none" stroke="${BLUE.pale}" stroke-width="${r === 86 ? 2.6 : 1.6}" stroke-dasharray="${r * 0.9} ${r * 0.35}" stroke-dashoffset="${k * f * 18}"/>`;
  }
  let tendrils = "";
  for (let i = 0; i < 10; i++) {
    const a = rad(i * 36 + 8);
    const sway = Math.sin(rad(f * 90 + i * 55)) * 10;
    const p0: Pt = [c[0] + Math.cos(a) * 122, c[1] + Math.sin(a) * 122];
    const p1: Pt = [c[0] + Math.cos(a) * 156 + sway, c[1] + Math.sin(a) * 156 - sway];
    const p2: Pt = [c[0] + Math.cos(a + 0.2) * 186, c[1] + Math.sin(a + 0.2) * 186 + sway];
    tendrils += path(`M${P(p0)}Q${P(p1)} ${P(p2)}`, BLUE.light, 1.4, "none", 'opacity=".8"');
  }
  let crown = "";
  for (let i = -3; i <= 3; i++) {
    const a = rad(-90 + i * 14);
    crown += poly(
      [
        [c[0] + Math.cos(a - 0.06) * 120, c[1] + Math.sin(a - 0.06) * 120],
        [
          c[0] + Math.cos(a) * (150 - Math.abs(i) * 6),
          c[1] + Math.sin(a) * (150 - Math.abs(i) * 6),
        ],
        [c[0] + Math.cos(a + 0.06) * 120, c[1] + Math.sin(a + 0.06) * 120],
      ],
      BLUE.light,
      BLUE.pale,
      1.2,
    );
  }
  // the eye that looks back: the pupil follows the frame
  const look: Pt = [
    [-8, -3],
    [0, 3],
    [8, -2],
    [0, -6],
  ][f] as Pt;
  const eyeShape = `M${c[0] - 42} ${c[1]}Q${c[0]} ${c[1] - 34} ${c[0] + 42} ${c[1]}Q${c[0]} ${c[1] + 34} ${c[0] - 42} ${c[1]}Z`;
  return [
    ground(),
    `<circle cx="${c[0]}" cy="${c[1]}" r="${(70 + f * 3).toFixed(1)}" fill="url(#flare)" opacity=".45"/>`,
    tendrils,
    rings,
    crown,
    path(eyeShape, BLUE.pale, 2, "#0b1e44"),
    circle([c[0] + look[0], c[1] + look[1]], 16, BLUE.light, 1.6, BLUE.light, 'fill-opacity=".5"'),
    circle([c[0] + look[0], c[1] + look[1]], 7, "#ffffff", 1, "#020510"),
  ].join("");
}

// --- scene table -------------------------------------------------------------------

type Draw = (f: number) => string;

interface Fight {
  draw: Draw;
  overlay: Overlay;
  hit: Pt;
}

const FIGHTS: Record<string, Fight> = {
  fight_skitter: {
    draw: skitter,
    hit: [350, 244],
    overlay: {
      hp: [0.7, 0.7, 0.58, 0.58],
      label: "HOSTILE",
      lock: [320, 246],
      lockR: 64,
      from: [370, 236],
      blips: [
        [200, 0.6],
        [330, 0.4],
      ],
    },
  },
  fight_burrower: {
    draw: burrower,
    hit: [310, 140],
    overlay: {
      hp: [0.8, 0.8, 0.66, 0.66],
      label: "SUBTERRANEAN",
      lock: [310, 200],
      lockR: 78,
      from: [334, 150],
      blips: [
        [90, 0.5],
        [270, 0.2],
      ],
    },
  },
  fight_stalker: {
    draw: stalker,
    hit: [350, 232],
    overlay: {
      hp: [0.76, 0.76, 0.62, 0.62],
      label: "THERMAL",
      lock: [296, 236],
      lockR: 82,
      from: [356, 226],
      blips: [
        [160, 0.7],
        [20, 0.5],
      ],
    },
  },
  fight_leech: {
    draw: leech,
    hit: [380, 178],
    overlay: {
      hp: [0.7, 0.7, 0.56, 0.56],
      label: "PARASITE",
      lock: [380, 182],
      lockR: 54,
      from: [400, 170],
      blips: [
        [310, 0.5],
        [120, 0.7],
      ],
    },
  },
  fight_wraith: {
    draw: wraith,
    hit: [310, 190],
    overlay: {
      hp: [0.85, 0.85, 0.7, 0.7],
      label: "UNKNOWN",
      lock: [310, 210],
      lockR: 90,
      from: [356, 170],
      blips: [
        [250, 0.4],
        [30, 0.8],
      ],
    },
  },
  fight_hound: {
    draw: hound,
    hit: [350, 226],
    overlay: {
      hp: [0.78, 0.78, 0.6, 0.6],
      label: "RIFT-BORN",
      lock: [310, 226],
      lockR: 84,
      from: [370, 216],
      blips: [
        [190, 0.5],
        [60, 0.6],
        [300, 0.8],
      ],
    },
  },
  fight_matriarch: {
    draw: matriarch,
    hit: [326, 206],
    overlay: {
      hp: [0.9, 0.9, 0.8, 0.8],
      boss: true,
      label: "MATRIARCH",
      lock: [300, 218],
      lockR: 110,
      from: [380, 190],
      blips: [
        [200, 0.6],
        [150, 0.4],
        [20, 0.7],
        [320, 0.5],
      ],
    },
  },
  fight_broodking: {
    draw: broodking,
    hit: [320, 200],
    overlay: {
      hp: [0.9, 0.9, 0.8, 0.8],
      boss: true,
      label: "BROODKING",
      lock: [320, 210],
      lockR: 118,
      from: [380, 190],
      blips: [
        [180, 0.4],
        [10, 0.5],
      ],
    },
  },
  fight_sovereign: {
    draw: sovereign,
    hit: [320, 214],
    overlay: {
      hp: [0.95, 0.95, 0.86, 0.86],
      boss: true,
      label: "SOVEREIGN",
      lock: [320, 214],
      lockR: 134,
      from: [400, 170],
      blips: [
        [270, 0.8],
        [90, 0.8],
        [0, 0.3],
      ],
    },
  },
};

export const COMBAT_SCENES: Record<string, Draw> = Object.fromEntries(
  Object.entries(FIGHTS).map(([id, fight]) => [
    id,
    (f: number) => fight.draw(f) + overlay(f, fight.overlay, fight.hit),
  ]),
);
