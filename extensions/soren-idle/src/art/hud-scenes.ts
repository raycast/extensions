import { BLUE, circle, line, P, path, poly, Pt, reticle, text } from "./hud";
import { hash } from "./util";

const rad = (deg: number) => (deg * Math.PI) / 180;
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// --- salvaging --------------------------------------------------------------------

const HULL_AT: Pt = [118, 112];
const HULL_TILT = 24;

/** Hull-local coordinates to screen coordinates. */
const hull = (x: number, y: number): Pt => {
  const a = rad(HULL_TILT);
  return [
    HULL_AT[0] + x * Math.cos(a) - y * Math.sin(a),
    HULL_AT[1] + x * Math.sin(a) + y * Math.cos(a),
  ];
};

export function moon(f: number): string {
  const c: Pt = [506, 84];
  let out = circle(c, 26, BLUE.light, 1.2, "#173f86");
  for (const k of [0.25, 0.6, 0.92]) {
    const rx = 26 * Math.abs(Math.cos(rad(f * 7 + k * 80)) * k + 0.08);
    out += `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${rx.toFixed(1)}" ry="26" fill="none" stroke="${BLUE.mid}" stroke-width=".8"/>`;
  }
  for (const dy of [-15, 0, 15]) {
    const w = Math.sqrt(26 * 26 - dy * dy);
    out += path(
      `M${c[0] - w} ${c[1] + dy}Q${c[0]} ${c[1] + dy + 5} ${c[0] + w} ${c[1] + dy}`,
      BLUE.mid,
      0.8,
    );
  }
  return out;
}

export function ground(): string {
  const ridge = [
    "M18 262",
    ...Array.from(
      { length: 13 },
      (_, i) => `L${18 + (i + 1) * 50} ${258 + Math.round(hash(i, 1, 3) * 10)}`,
    ),
    "V292H18Z",
  ].join("");
  let out = path(ridge, "none", 0, "#2b78d8", 'opacity=".55"');
  // the foreground that buries the hull
  const top: string[] = [];
  for (let x = 18; x <= 622; x += 22) {
    top.push(`L${x} ${Math.round(296 + Math.sin(x / 38) * 6 + hash(x, 2, 4) * 6)}`);
  }
  out += path(`M18 396${top.join("")}L622 396Z`, "none", 0, BLUE.bg);
  out += path(`M18 ${300}${top.join("")}`.replace("M18 300L", "M"), BLUE.mid, 1.2);
  for (let i = 0; i < 6; i++) {
    const y = 318 + i * 13;
    let d = `M${60 + i * 14} ${y}`;
    for (let x = 60 + i * 14; x < 560 - i * 18; x += 40) {
      d += `Q${x + 20} ${y - 5 + Math.round(hash(x, i, 5) * 8)} ${x + 40} ${y + Math.round(hash(x, i, 6) * 4)}`;
    }
    out += path(d, BLUE.line, 0.9, "none", `opacity="${(0.65 - i * 0.08).toFixed(2)}"`);
  }
  return out;
}

export function hullBody(): string {
  const L = (x: number, y: number) => `${x},${y}`;
  let out = "";
  // main shell and nozzle
  out += `<polygon points="${[L(40, 0), L(292, -2), L(330, 22), L(330, 80), L(292, 102), L(40, 100)].join(" ")}" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.4" stroke-linejoin="round"/>`;
  out += `<polygon points="${[L(0, 12), L(40, 0), L(40, 100), L(0, 88)].join(" ")}" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.4" stroke-linejoin="round"/>`;
  out += `<ellipse cx="2" cy="50" rx="9" ry="34" fill="none" stroke="${BLUE.pale}" stroke-width="1"/>`;
  // ring seams, with a little bulge to read as a cylinder
  for (const x of [80, 124, 236, 262]) {
    out += path(`M${x} 0Q${x + 5} 50 ${x} 100`, BLUE.mid, 1);
  }
  // panel lines
  for (const [x1, x2, y] of [
    [44, 120, 24],
    [44, 120, 70],
    [236, 290, 22],
  ] as const) {
    out += line([x1, y], [x2, y], BLUE.mid, 0.8, 'opacity=".7"');
  }
  out += poly(
    [
      [56, 34],
      [92, 34],
      [92, 60],
      [56, 60],
    ],
    "none",
    BLUE.mid,
    0.9,
  );
  // the breach
  const hole: Pt[] = [
    [134, 8],
    [156, 2],
    [172, 14],
    [192, 4],
    [214, 20],
    [226, 46],
    [210, 70],
    [220, 94],
    [190, 100],
    [170, 84],
    [150, 98],
    [136, 70],
    [146, 44],
  ];
  out += poly(hole, "#0b1e44", BLUE.pale, 1.5);
  for (let i = 0; i < 6; i++) {
    const x = 150 + i * 13;
    out += path(`M${x} 10Q${x + 8} 50 ${x - 4} 96`, BLUE.line, 1, "none", 'opacity=".8"');
  }
  out += path("M146 44Q180 36 224 50", BLUE.line, 1, "none", 'opacity=".7"');
  out += path("M146 66Q180 74 214 66", BLUE.line, 1, "none", 'opacity=".7"');
  return out;
}

function plate(f: number, cutT: number): string {
  const L = (x: number, y: number) => `${x},${y}`;
  let out = `<polygon points="${[L(238, 4), L(328, 24), L(330, 88), L(250, 102), L(226, 70)].join(" ")}" fill="url(#plate)" stroke="${BLUE.pale}" stroke-width="1.6" stroke-linejoin="round"/>`;
  out += path("M246 24L318 40M244 60L322 70M270 14L274 92", BLUE.deep, 1, "none", 'opacity=".55"');
  // the cut, growing down the plate's trailing edge
  const a: Pt = [328, 24];
  const b: Pt = [330, 88];
  const tip = lerp(a, b, cutT);
  out += line(a, tip, "#ffffff", 2.4);
  return out;
}

function cables(f: number): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    const s = hull(150 + i * 14, 98);
    const sway = Math.sin(rad(f * 90 + i * 55)) * 3;
    const e: Pt = [s[0] - 6 + i * 3 + sway, s[1] + 44 + (i % 3) * 9];
    out += path(
      `M${P(s)}Q${s[0] + 14 + sway * 2},${s[1] + 28} ${P(e)}`,
      BLUE.light,
      1.1,
      "none",
      'opacity=".85"',
    );
  }
  return out;
}

export function arm(tip: Pt, fromAbove = false): string {
  const base: Pt = fromAbove ? [tip[0] + 96, 52] : [tip[0] + 132, tip[1] + 20];
  const shoulder: Pt = fromAbove ? [tip[0] + 96, tip[1] - 104] : [tip[0] + 100, tip[1] - 62];
  const elbow: Pt = fromAbove ? [tip[0] + 52, tip[1] - 62] : [tip[0] + 48, tip[1] - 36];
  const head: Pt = [tip[0] + 10, tip[1] - 12];
  let out = "";
  out += path(`M${P(base)}L${P(shoulder)}L${P(elbow)}L${P(head)}L${P(tip)}`, BLUE.pale, 3, "none");
  for (const j of [shoulder, elbow, head]) out += circle(j, 4, BLUE.pale, 1.4, BLUE.bg);
  out += poly(
    [
      [base[0] - 14, base[1]],
      [base[0] + 14, base[1]],
      [base[0] + 10, base[1] + 10],
      [base[0] - 10, base[1] + 10],
    ],
    BLUE.deep,
    BLUE.light,
    1,
  );
  return out;
}

export function sparks(tip: Pt, f: number): string {
  let out = `<circle cx="${tip[0]}" cy="${tip[1]}" r="${(14 + f * 2).toFixed(1)}" fill="url(#flare)"/>`;
  for (let i = 0; i < 11; i++) {
    const ang = rad(-150 + i * 22 + hash(i, f, 7) * 16);
    const d = 8 + hash(i, f, 8) * 30;
    const p: Pt = [tip[0] + Math.cos(ang) * d, tip[1] + Math.sin(ang) * d + d * 0.25];
    const q: Pt = [
      tip[0] + Math.cos(ang) * (d - 5),
      tip[1] + Math.sin(ang) * (d - 5) + (d - 5) * 0.25,
    ];
    out += line(
      q,
      p,
      i % 2 ? "#ffffff" : BLUE.light,
      1.2,
      `opacity="${(0.95 - d / 60).toFixed(2)}"`,
    );
  }
  return out;
}

export function salvaging(f: number): string {
  const cutT = [0.42, 0.5, 0.58, 0.5][f];
  const tip = hull(328 + 0, 24 + (88 - 24) * cutT);
  const target = hull(186, 52);
  const edge = hull(282, 30);
  const label: Pt = [452, 154];
  return [
    moon(f),
    ground(),
    `<g transform="translate(${HULL_AT[0]} ${HULL_AT[1]}) rotate(${HULL_TILT})">${hullBody()}</g>`,
    cables(f),
    // rubble buries the lower hull: redrawn ground edge over the hull
    path(`M18 400V312Q120 296 220 318T380 330T622 318V400Z`, "none", 0, BLUE.bg, 'opacity="0"'),
    `<g transform="translate(${HULL_AT[0]} ${HULL_AT[1]}) rotate(${HULL_TILT})">${plate(f, cutT)}</g>`,
    arm(tip),
    sparks(tip, f),
    reticle(target, 40 + (f % 2) * 2, f),
    path(`M${P(edge)}L${P([label[0] - 14, label[1] + 8])}H${label[0] - 6}`, BLUE.pale, 1.2),
    circle(edge, 2.5, BLUE.pale, 1, BLUE.pale),
    path(`M${label[0] + 6} ${label[1] - 18}h-10v34h10`, BLUE.pale, 1.6),
    path(`M${label[0] + 112} ${label[1] - 18}h10v34h-10`, BLUE.pale, 1.6),
    text(label[0] + 14, label[1] + 5, 13, "SALVAGEABLE", BLUE.pale, 'letter-spacing="1"'),
  ].join("");
}

// --- mining ------------------------------------------------------------------------

const ROCK: Pt[] = [
  [100, 336],
  [204, 172],
  [254, 112],
  [304, 82],
  [470, 68],
  [508, 68],
  [508, 336],
];
const HIT: Pt = [336, 224];
const BEAM_FROM: Pt = [18, 142];

export function crystal(x: number, y: number, h: number, w: number, tilt: number): string {
  const pts: Pt[] = [
    [-w, 0],
    [w, 0],
    [w * 0.85, -h * 0.68],
    [0, -h],
    [-w * 0.85, -h * 0.68],
  ];
  const a = rad(tilt);
  const world = pts.map(([px, py]): Pt => [
    x + px * Math.cos(a) - py * Math.sin(a),
    y + px * Math.sin(a) + py * Math.cos(a),
  ]);
  const mid = world[3];
  return [
    poly(world, "url(#crystal)", BLUE.pale, 1.2),
    line(
      mid,
      [(world[0][0] + world[1][0]) / 2, (world[0][1] + world[1][1]) / 2],
      BLUE.deep,
      0.8,
      'opacity=".6"',
    ),
    line(world[0], world[4], BLUE.deep, 0.8, 'opacity=".5"'),
  ].join("");
}

function strata(): string {
  let out = "";
  for (let k = 0; k < 26; k++) {
    let d = "";
    for (let x = 90; x <= 520; x += 22) {
      const y =
        340 -
        (x - 100) * 0.64 +
        (k - 13) * 17 +
        Math.sin(x * 0.045 + k * 0.7) * 6 +
        hash(x, k, 9) * 2;
      d += `${d ? "L" : "M"}${x} ${y.toFixed(1)}`;
    }
    out += path(d, BLUE.light, 0.9, "none", `opacity="${(0.4 + (k % 4) * 0.12).toFixed(2)}"`);
  }
  return out;
}

function gauge(f: number, hit: Pt = HIT): string {
  const top = 68;
  const bottom = 336;
  let out = `<rect x="524" y="${top}" width="48" height="${bottom - top}" fill="none" stroke="${BLUE.pale}" stroke-width="1.4"/>`;
  for (let i = 0; i <= 50; i++) {
    const y = top + ((bottom - top) * i) / 50;
    const major = i % 10 === 0;
    out += line([572, y], [572 - (major ? 22 : i % 5 === 0 ? 15 : 8), y], BLUE.light, 0.9);
    if (major) out += text(578, y + 3, 8, `${i * 10}M`, BLUE.light);
  }
  // the marker follows the beam
  out += poly(
    [
      [524, hit[1]],
      [538, hit[1] - 6],
      [538, hit[1] + 6],
    ],
    BLUE.pale,
    BLUE.pale,
    1,
  );
  out += line(
    [hit[0] + 70, hit[1]],
    [524, hit[1]],
    BLUE.mid,
    0.8,
    `stroke-dasharray="3 5" stroke-dashoffset="${f * 4}" opacity=".7"`,
  );
  return out;
}

function debris(f: number): string {
  let out = "";
  for (let i = 0; i < 26; i++) {
    const phase = ((f + hash(i, 1, 21) * 4) % 4) / 4;
    const ang = rad(150 + hash(i, 2, 21) * 100);
    const dist = 14 + phase * (50 + hash(i, 3, 21) * 90);
    const p: Pt = [HIT[0] + Math.cos(ang) * dist, HIT[1] + Math.sin(ang) * dist * 0.9];
    const r = 1.4 + hash(i, 4, 21) * 3.2;
    out += `<ellipse cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.65).toFixed(1)}" transform="rotate(${Math.round(hash(i, 5, 21) * 180)} ${p[0].toFixed(1)} ${p[1].toFixed(1)})" fill="none" stroke="${BLUE.light}" stroke-width="1" opacity="${(1 - phase * 0.8).toFixed(2)}"/>`;
  }
  return out;
}

export function mining(f: number): string {
  const flick = [1, 1.25, 0.9, 1.15][f];
  const veinGlow = [0.5, 0.62, 0.7, 0.58][f];
  return [
    `<clipPath id="rockClip"><polygon points="${ROCK.map(P).join(" ")}"/></clipPath>`,
    poly(ROCK, "url(#rock)", BLUE.pale, 1.6),
    `<g clip-path="url(#rockClip)">`,
    strata(),
    // the vein
    `<polygon points="231,336 261,336 485,68 445,68" fill="${BLUE.light}" opacity="${veinGlow}"/>`,
    path("M246 336L465 68", BLUE.pale, 1.2, "none", 'opacity=".8"'),
    `<circle cx="${HIT[0]}" cy="${HIT[1]}" r="${(34 * flick).toFixed(1)}" fill="url(#flare)"/>`,
    `</g>`,
    crystal(292, 268, 34, 9, -8),
    crystal(314, 270, 46, 11, 6),
    crystal(344, 232, 52, 12, -4),
    crystal(372, 190, 34, 9, 10),
    crystal(406, 148, 40, 10, -6),
    crystal(430, 116, 30, 8, 8),
    // the beam
    line(BEAM_FROM, HIT, BLUE.line, 9 * flick, 'opacity=".35"'),
    line(BEAM_FROM, HIT, BLUE.light, 4 * flick),
    line(BEAM_FROM, HIT, "#ffffff", 1.6),
    `<circle cx="${BEAM_FROM[0] + 8}" cy="${BEAM_FROM[1]}" r="10" fill="url(#flare)"/>`,
    debris(f),
    reticle(HIT, 52 + (f % 2) * 2, f),
    gauge(f),
  ].join("");
}

/** A leader line from a point on the subject to a bracketed label. */
export function callout(from: Pt, at: Pt, label: string): string {
  const w = label.length * 8.2 + 22;
  return [
    path(`M${P(from)}L${P([at[0] - 14, at[1] + 8])}H${at[0] - 6}`, BLUE.pale, 1.2),
    circle(from, 2.5, BLUE.pale, 1, BLUE.pale),
    path(`M${at[0] + 6} ${at[1] - 18}h-10v34h10`, BLUE.pale, 1.6),
    path(`M${at[0] + w} ${at[1] - 18}h10v34h-10`, BLUE.pale, 1.6),
    text(at[0] + 14, at[1] + 5, 13, label, BLUE.pale, 'letter-spacing="1"'),
  ].join("");
}

// --- strip wiring ------------------------------------------------------------------

type Cubic = [Pt, Pt, Pt, Pt];

function bez([a, b, c, d]: Cubic, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

function cubicPath(curve: Cubic, t0: number, t1: number): string {
  let d = "";
  for (let i = 0; i <= 18; i++) {
    d += `${i ? "L" : "M"}${P(bez(curve, t0 + ((t1 - t0) * i) / 18))}`;
  }
  return d;
}

export function wiring(f: number): string {
  const sway = Math.sin(rad(f * 90)) * 3;
  const cutIndex = 3;
  const gap = 0.02 + f * 0.012;
  let tip: Pt = [300, 240];
  let cables = "";
  for (let i = 0; i < 8; i++) {
    const y = 176 + i * 11;
    const sag = 34 + i * 5 + (i % 2 ? sway : -sway);
    const curve: Cubic = [
      [176, y],
      [230, y + sag],
      [350, y + sag + 10],
      [404, y],
    ];
    if (i === cutIndex) {
      tip = bez(curve, 0.5);
      cables += path(cubicPath(curve, 0, 0.5 - gap), BLUE.pale, 2.6);
      cables += path(cubicPath(curve, 0.5 + gap, 1), BLUE.pale, 2.6, "none", 'opacity=".9"');
    } else {
      cables += path(
        cubicPath(curve, 0, 1),
        BLUE.light,
        1.5,
        "none",
        `opacity="${0.55 + (i % 3) * 0.15}"`,
      );
    }
  }
  const box = (x: number) =>
    [
      `<rect x="${x}" y="156" width="36" height="104" rx="4" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.4"/>`,
      ...Array.from({ length: 8 }, (_, i) =>
        circle([x + (x < 200 ? 36 : 0), 176 + i * 11], 2.4, BLUE.pale, 1, BLUE.bg),
      ),
      line([x + 8, 166], [x + 28, 166], BLUE.mid, 1),
      line([x + 8, 250], [x + 28, 250], BLUE.mid, 1),
    ].join("");
  return [
    moon(f),
    // the bulkhead, with its panel torn off
    `<rect x="104" y="92" width="372" height="232" rx="8" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.6"/>`,
    ...[
      [116, 104],
      [464, 104],
      [116, 312],
      [464, 312],
    ].map(([x, y]) => circle([x, y], 3, BLUE.mid, 1)),
    `<rect x="128" y="116" width="324" height="184" rx="4" fill="#0b1e44" stroke="${BLUE.pale}" stroke-width="1.4"/>`,
    path("M140 128H440M140 288H440", BLUE.dim, 1, "none", 'opacity=".9"'),
    box(140),
    box(404),
    cables,
    arm(tip, true),
    sparks(tip, f),
    reticle([422, 208], 36 + (f % 2) * 2, f),
    callout(tip, [492, 150], "CONDUIT"),
  ].join("");
}

// --- breach cargo pod --------------------------------------------------------------

/** A point a fraction t of the way round a rectangle's outline, clockwise from its top left. */
function outline(x: number, y: number, w: number, h: number, t: number): Pt {
  const per = 2 * (w + h);
  let d = (((t % 1) + 1) % 1) * per;
  if (d <= w) return [x + d, y];
  d -= w;
  if (d <= h) return [x + w, y + d];
  d -= h;
  if (d <= w) return [x + w - d, y + h];
  return [x, y + h - (d - w)];
}

export function cargo(f: number): string {
  const hatch = { x: 262, y: 168, w: 116, h: 96 };
  const t = [0.2, 0.3, 0.4, 0.3][f];
  const tip = outline(hatch.x, hatch.y, hatch.w, hatch.h, t);
  let cut = `M${P(outline(hatch.x, hatch.y, hatch.w, hatch.h, 0))}`;
  for (let i = 1; i <= 24; i++) {
    cut += `L${P(outline(hatch.x, hatch.y, hatch.w, hatch.h, (t * i) / 24))}`;
  }
  let ribs = "";
  for (let i = 0; i < 6; i++) {
    const x = 186 + i * 46;
    if (x > hatch.x - 14 && x < hatch.x + hatch.w + 14) continue;
    ribs += path(`M${x} 148V282`, BLUE.mid, 1.1, "none", 'opacity=".75"');
  }
  return [
    moon(f),
    ground(),
    // the pod: a ribbed container half sunk into the ground
    `<rect x="150" y="128" width="340" height="168" rx="26" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.6"/>`,
    path("M168 146H472M168 280H472", BLUE.mid, 1, "none", 'opacity=".6"'),
    ribs,
    `<rect x="${hatch.x}" y="${hatch.y}" width="${hatch.w}" height="${hatch.h}" rx="6" fill="#143572" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    circle([hatch.x + hatch.w / 2, hatch.y + hatch.h / 2], 20, BLUE.light, 1.4),
    path(
      `M${hatch.x + hatch.w / 2 - 20} ${hatch.y + hatch.h / 2}h40M${hatch.x + hatch.w / 2} ${hatch.y + hatch.h / 2 - 20}v40`,
      BLUE.light,
      1.4,
    ),
    // light leaking out of the seam
    path(cut, "#ffffff", 2.6),
    path(cut, BLUE.light, 7, "none", 'opacity=".35"'),
    arm(tip, true),
    sparks(tip, f),
    reticle([hatch.x + hatch.w / 2, hatch.y + hatch.h / 2], 62 + (f % 2) * 2, f),
    callout([hatch.x + hatch.w, hatch.y + 14], [492, 138], "SEALED"),
  ].join("");
}

// --- mine ferrite ------------------------------------------------------------------

const TERRACE: Pt[] = [
  [110, 336],
  [110, 196],
  [186, 196],
  [186, 148],
  [262, 148],
  [262, 98],
  [508, 98],
  [508, 336],
];
const FERRITE_HIT: Pt = [318, 244];
const FERRITE_BEAM: Pt = [18, 52];

/** A rugged lump of ore: a jagged outline split into facets, lit from the top left. */
function chunk(cx: number, cy: number, r: number, seed: number, bright = 1): string {
  const n = 6 + Math.floor(hash(seed, 1, 41) * 3);
  const rim: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + hash(seed, i, 42) * 0.6) / n) * Math.PI * 2;
    const d = r * (0.62 + hash(seed, i, 43) * 0.6);
    rim.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.82]);
  }
  const core: Pt = [
    cx + (hash(seed, 7, 44) - 0.5) * r * 0.5,
    cy + (hash(seed, 8, 44) - 0.5) * r * 0.4,
  ];
  const fills = ["#a9dcff", "#6cb4ff", "#3f8fe8", "#2160b8"];
  const facets = ["", "", "", ""];
  for (let i = 0; i < n; i++) {
    const a = rim[i];
    const b = rim[(i + 1) % n];
    const mx = (a[0] + b[0]) / 2 - core[0];
    const my = (a[1] + b[1]) / 2 - core[1];
    // facets facing the light (up and left) are bright
    const lit = (-mx - my) / (Math.hypot(mx, my) * 1.414 || 1);
    const tone = lit > 0.55 ? 0 : lit > 0.1 ? 1 : lit > -0.4 ? 2 : 3;
    facets[tone] += `M${P(core)}L${P(a)}L${P(b)}Z`;
  }
  let out = "";
  facets.forEach((d, tone) => {
    if (d)
      out += path(d, BLUE.pale, 0.9, fills[tone], `fill-opacity="${(0.9 * bright).toFixed(2)}"`);
  });
  // a glint on the brightest face
  out += line(
    [cx - r * 0.5, cy - r * 0.3],
    [cx - r * 0.15, cy - r * 0.5],
    "#ffffff",
    1.2,
    'opacity=".8"',
  );
  return out;
}

export function ferrite(f: number): string {
  const flick = [1, 1.2, 0.9, 1.15][f];
  let layers = "";
  for (let k = 0; k < 24; k++) {
    let d = "";
    for (let x = 100; x <= 520; x += 24) {
      const y = 100 + k * 11 + Math.sin(x * 0.04 + k * 0.9) * 3 + hash(x, k, 31) * 2;
      d += `${d ? "L" : "M"}${x} ${y.toFixed(1)}`;
    }
    layers += path(d, BLUE.light, 0.9, "none", `opacity="${(0.38 + (k % 3) * 0.12).toFixed(2)}"`);
  }
  // a ragged seam of ore lumps, two rows deep, with loose chips around it
  let seam = "";
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 10; i++) {
      const seed = row * 20 + i;
      const cx = 228 + i * 27 + (row ? 13 : 0) + (hash(seed, 1, 45) - 0.5) * 8;
      const cy = 230 + row * 24 + (hash(seed, 2, 45) - 0.5) * 12;
      const near = Math.abs(cx - FERRITE_HIT[0]) < 32 && row === 0;
      seam += chunk(
        cx,
        cy + (near ? (f % 2) * 1.5 : 0),
        12 + hash(seed, 3, 45) * 9,
        seed,
        near ? 1.1 : 1,
      );
    }
  }
  for (let i = 0; i < 9; i++) {
    const cx = 220 + hash(i, 4, 46) * 280;
    const cy = 214 + hash(i, 5, 46) * 70;
    seam += chunk(cx, cy, 3 + hash(i, 6, 46) * 3, 100 + i, 0.8);
  }
  // cracks spreading from the strike
  for (let i = 0; i < 5; i++) {
    const a = rad(-30 + i * 55 + hash(i, f, 47) * 12);
    const d = 14 + hash(i, 9, 47) * 16;
    seam += line(
      FERRITE_HIT,
      [FERRITE_HIT[0] + Math.cos(a) * d, FERRITE_HIT[1] + Math.sin(a) * d],
      "#ffffff",
      1,
      'opacity=".85"',
    );
  }
  let falling = "";
  for (let i = 0; i < 22; i++) {
    const phase = ((f + hash(i, 1, 33) * 4) % 4) / 4;
    const vx = (hash(i, 2, 33) - 0.5) * 120;
    const vy = 20 + hash(i, 3, 33) * 60;
    const p: Pt = [FERRITE_HIT[0] + vx * phase, FERRITE_HIT[1] - vy * phase + 150 * phase * phase];
    const r = 1.6 + hash(i, 4, 33) * 3.4;
    falling += `<rect x="${(p[0] - r).toFixed(1)}" y="${(p[1] - r).toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" transform="rotate(${Math.round(hash(i, 5, 33) * 90 + phase * 90)} ${p[0].toFixed(1)} ${p[1].toFixed(1)})" fill="none" stroke="${BLUE.light}" stroke-width="1" opacity="${(1 - phase * 0.8).toFixed(2)}"/>`;
  }
  return [
    `<clipPath id="terraceClip"><polygon points="${TERRACE.map(P).join(" ")}"/></clipPath>`,
    poly(TERRACE, "url(#rock)", BLUE.pale, 1.6),
    `<g clip-path="url(#terraceClip)">${layers}</g>`,
    seam,
    `<circle cx="${FERRITE_HIT[0]}" cy="${FERRITE_HIT[1]}" r="${(30 * flick).toFixed(1)}" fill="url(#flare)"/>`,
    line(FERRITE_BEAM, FERRITE_HIT, BLUE.line, 9 * flick, 'opacity=".35"'),
    line(FERRITE_BEAM, FERRITE_HIT, BLUE.light, 4 * flick),
    line(FERRITE_BEAM, FERRITE_HIT, "#ffffff", 1.6),
    `<circle cx="${FERRITE_BEAM[0] + 8}" cy="${FERRITE_BEAM[1]}" r="10" fill="url(#flare)"/>`,
    falling,
    reticle(FERRITE_HIT, 46 + (f % 2) * 2, f),
    gauge(f, FERRITE_HIT),
  ].join("");
}
