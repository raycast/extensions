import { BLUE, circle, line, P, path, poly, Pt, reticle, text } from "./hud";
import { mushroom } from "./hud-grow";
import { arm, callout, crystal } from "./hud-scenes";
import { hash } from "./util";

const rad = (deg: number) => (deg * Math.PI) / 180;
const BENCH = 312;

function bench(): string {
  return [
    line([60, BENCH], [580, BENCH], BLUE.pale, 1.8),
    line([84, BENCH + 8], [556, BENCH + 8], BLUE.mid, 1, 'opacity=".6"'),
    line([110, BENCH + 16], [530, BENCH + 16], BLUE.dim, 1, 'opacity=".8"'),
  ].join("");
}

function bubbles(
  cx: number,
  bottom: number,
  top: number,
  half: number,
  f: number,
  n: number,
  seed: number,
): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const phase = ((f + hash(i, 1, seed) * 4) % 4) / 4;
    const y = bottom - (bottom - top) * phase;
    const x = cx + (hash(i, 2, seed) - 0.5) * 2 * half;
    out += circle(
      [x, y],
      1.6 + hash(i, 3, seed) * 3.2,
      BLUE.pale,
      1,
      "none",
      `opacity="${(0.9 - phase * 0.5).toFixed(2)}"`,
    );
  }
  return out;
}

function flame(cx: number, by: number, f: number): string {
  const grow = [0, 5, 2, 7][f];
  const base = poly(
    [
      [cx - 26, by],
      [cx + 26, by],
      [cx + 18, by + 12],
      [cx - 18, by + 12],
    ],
    "url(#hull)",
    BLUE.light,
    1.3,
  );
  const tongue = (k: number, h: number) =>
    path(
      `M${cx - 14 * k} ${by}Q${cx - 16 * k} ${by - h * 0.5} ${cx} ${by - h - grow}Q${cx + 16 * k} ${by - h * 0.5} ${cx + 14 * k} ${by}Z`,
      BLUE.pale,
      1.2,
      k > 0.6 ? "none" : BLUE.light,
      k > 0.6 ? "" : 'fill-opacity=".55"',
    );
  return base + tongue(1, 34) + tongue(0.55, 20);
}

function steam(cx: number, y: number, f: number, n = 3): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * 22;
    const sway = Math.sin(rad(f * 90 + i * 70)) * 5;
    out += path(
      `M${x} ${y}q${-8 + sway} -14 0 -28t0 -28t${6 - sway} -26`,
      BLUE.light,
      1.3,
      "none",
      `opacity="${0.7 - i * 0.1}"`,
    );
  }
  return out;
}

function dial(c: Pt, r: number, v: number): string {
  let out = path(`M${c[0] - r} ${c[1]}A${r} ${r} 0 0 1 ${c[0] + r} ${c[1]}`, BLUE.pale, 1.6);
  for (let i = 0; i <= 10; i++) {
    const a = rad(180 + i * 18);
    out += line(
      [c[0] + Math.cos(a) * (r - 7), c[1] + Math.sin(a) * (r - 7)],
      [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r],
      BLUE.light,
      1,
    );
  }
  const a = rad(180 + v * 180);
  out += line(c, [c[0] + Math.cos(a) * (r - 10), c[1] + Math.sin(a) * (r - 10)], "#ffffff", 2);
  out += circle(c, 4, BLUE.pale, 1.2, BLUE.bg);
  out += `<rect x="${c[0] - r}" y="${c[1] + 6}" width="${2 * r}" height="5" fill="none" stroke="${BLUE.mid}" stroke-width=".8"/>`;
  out += `<rect x="${c[0] - r}" y="${c[1] + 6}" width="${(2 * r * v).toFixed(1)}" height="5" fill="${BLUE.light}" opacity=".85"/>`;
  return out;
}

function pot(cx: number, f: number, fill: string): string {
  const top = 218;
  return [
    poly(
      [
        [cx - 64, top],
        [cx + 64, top],
        [cx + 54, 282],
        [cx - 54, 282],
      ],
      "url(#hull)",
      BLUE.light,
      1.5,
    ),
    `<ellipse cx="${cx}" cy="${top}" rx="64" ry="11" fill="${fill}" fill-opacity=".8" stroke="${BLUE.pale}" stroke-width="1.5"/>`,
    path(`M${cx - 64} ${top + 6}h-14v10h14M${cx + 64} ${top + 6}h14v10h-14`, BLUE.pale, 1.6),
    path(`M${cx - 50} 238Q${cx} 246 ${cx + 50} 238`, BLUE.mid, 1, "none", 'opacity=".7"'),
  ].join("");
}

// --- cooking -----------------------------------------------------------------------

export function ration(f: number): string {
  const stir = rad(f * 90);
  const tip: Pt = [300 + Math.cos(stir) * 22, 218 + Math.sin(stir) * 5];
  return [
    bench(),
    flame(300, 262, f),
    pot(300, f, "#2d78dc"),
    steam(300, 200, f),
    mushroom(176, BENCH, 22, 50, f),
    mushroom(214, BENCH, 16, 34, f + 1),
    arm(tip, true),
    line(tip, [tip[0] - 10, tip[1] + 20], BLUE.pale, 3),
    circle([tip[0] - 10, tip[1] + 22], 5, BLUE.pale, 1.6, BLUE.bg),
    bubbles(300, 232, 205, 44, f, 7, 81),
    dial([480, 262], 40, [0.62, 0.7, 0.78, 0.7][f]),
    reticle([300, 246], 60 + (f % 2) * 2, f),
    callout([364, 226], [452, 124], "COOKING"),
  ].join("");
}

function honeycomb(x0: number, y0: number, cols: number, rows: number, r: number): string {
  let d = "";
  for (let c = 0; c < cols; c++) {
    for (let rw = 0; rw < rows; rw++) {
      const cx = x0 + c * r * 1.75;
      const cy = y0 + rw * r * 2 + (c % 2 ? r : 0);
      const pts = Array.from({ length: 6 }, (_, i): Pt => [
        cx + Math.cos(rad(60 * i)) * r,
        cy + Math.sin(rad(60 * i)) * r,
      ]);
      d += `M${pts.map(P).join("L")}Z`;
    }
  }
  return path(d, BLUE.mid, 1, "none", 'opacity=".55"');
}

export function honeyRation(f: number): string {
  const jar: Pt = [190, 128];
  const drip = [0, 6, 12, 6][f];
  let stream = path(`M232 150C250 ${170 + drip} 262 ${190 + drip} 270 ${216}`, BLUE.pale, 3.4);
  stream += path(
    `M232 150C250 ${170 + drip} 262 ${190 + drip} 270 ${216}`,
    "#ffffff",
    1,
    "none",
    'opacity=".9"',
  );
  for (let i = 0; i < 3; i++) {
    const phase = ((f + i * 1.3) % 4) / 4;
    stream += circle([271 + i * 2, 196 + phase * 24], 2.6 - phase, BLUE.pale, 1, BLUE.pale);
  }
  return [
    honeycomb(386, 104, 4, 2, 15),
    bench(),
    `<g transform="rotate(-38 ${jar[0]} ${jar[1]})">${[
      `<rect x="${jar[0] - 30}" y="${jar[1] - 22}" width="60" height="64" rx="10" fill="url(#plate)" fill-opacity=".55" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
      `<rect x="${jar[0] - 22}" y="${jar[1] - 34}" width="44" height="14" rx="3" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.4"/>`,
      path(
        `M${jar[0] - 18} ${jar[1] - 2}h36M${jar[0] - 18} ${jar[1] + 14}h36`,
        BLUE.deep,
        1,
        "none",
        'opacity=".6"',
      ),
    ].join("")}</g>`,
    stream,
    flame(300, 262, f),
    pot(300, f, "#3a98ff"),
    steam(300, 200, f, 2),
    // the finished ration, glowing on a tray
    `<rect x="428" y="270" width="104" height="14" rx="3" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.3"/>`,
    `<rect x="444" y="246" width="72" height="24" rx="8" fill="url(#plate)" fill-opacity=".85" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    path("M460 248v20M476 248v20M492 248v20M508 248v20", BLUE.deep, 1, "none", 'opacity=".55"'),
    `<circle cx="480" cy="258" r="${(36 + f * 3).toFixed(1)}" fill="url(#flare)" opacity=".22"/>`,
    reticle([300, 246], 60 + (f % 2) * 2, f),
    callout([516, 252], [470, 160], "STAR HONEY"),
  ].join("");
}

// --- xenochemistry -----------------------------------------------------------------

function star(c: Pt, r: number, color: string = BLUE.pale): string {
  return path(
    `M${c[0]} ${c[1] - r}Q${c[0]} ${c[1]} ${c[0] + r} ${c[1]}Q${c[0]} ${c[1]} ${c[0]} ${c[1] + r}Q${c[0]} ${c[1]} ${c[0] - r} ${c[1]}Q${c[0]} ${c[1]} ${c[0]} ${c[1] - r}Z`,
    color,
    1,
    color,
  );
}

export function swift(f: number): string {
  const cx = 300;
  const by = 282;
  const h = 160;
  const neckBottom = by - h * 0.45;
  const wAt = (y: number) => 16 + (50 - 16) * ((y - neckBottom) / (by - neckBottom));
  const level = by - h * 0.32;
  let chips = "";
  for (let i = 0; i < 8; i++) {
    const a = rad(f * 90 + i * 45);
    chips += circle(
      [cx + Math.cos(a) * (6 + (i % 4) * 7), level + 22 + Math.sin(a) * 10 + (i % 3) * 6],
      1.6 + (i % 3),
      BLUE.pale,
      0.9,
      BLUE.pale,
    );
  }
  let chevrons = "";
  for (let i = 0; i < 3; i++) {
    const x = 410 + i * 30 + ((f * 8) % 24);
    chevrons += path(
      `M${x} 196l16 18l-16 18`,
      BLUE.pale,
      3,
      "none",
      `opacity="${(0.95 - i * 0.28).toFixed(2)}"`,
    );
  }
  let speed = "";
  for (let i = 0; i < 4; i++)
    speed += line(
      [140 + i * 10, 190 + i * 16],
      [200 + i * 6 - f * 3, 190 + i * 16],
      BLUE.light,
      1.4,
      'opacity=".7"',
    );
  return [
    bench(),
    flame(cx, 294, f),
    `<polygon points="${[P([cx - wAt(level), level]), P([cx + wAt(level), level]), P([cx + 50, by]), P([cx - 50, by])].join(" ")}" fill="url(#plate)" fill-opacity=".6"/>`,
    path(
      `M${cx - 16} ${by - h}V${neckBottom}L${cx - 50} ${by}H${cx + 50}L${cx + 16} ${neckBottom}V${by - h}`,
      BLUE.pale,
      1.8,
    ),
    path(`M${cx - 22} ${by - h}h44`, BLUE.pale, 2.4),
    path(
      `M${cx - wAt(level)} ${level}Q${cx} ${level + 6} ${cx + wAt(level)} ${level}`,
      "#ffffff",
      1.4,
    ),
    chips,
    bubbles(cx, level + 30, by - h + 8, 12, f, 6, 91),
    mushroom(cx + 4, level + 40, 8, 14, f, false),
    speed,
    chevrons,
    reticle([cx, level + 24], 56 + (f % 2) * 2, f),
    callout([cx + 44, level + 6], [452, 120], "SWIFT"),
  ].join("");
}

export function fortune(f: number): string {
  const c: Pt = [320, 246];
  let drops = "";
  for (let i = 0; i < 3; i++) {
    const phase = ((f + i * 1.4) % 4) / 4;
    drops += circle([320 + (i - 1) * 2, 120 + phase * 74], 3.2 - phase, BLUE.pale, 1, BLUE.pale);
  }
  const clover = [
    [-8, -8],
    [8, -8],
    [-8, 8],
    [8, 8],
  ]
    .map(([dx, dy]) =>
      circle([c[0] + dx, c[1] + 12 + dy], 8, BLUE.pale, 1.3, BLUE.light, 'fill-opacity=".35"'),
    )
    .join("");
  const sparks = [
    [-96, -44],
    [100, -20],
    [-70, 40],
    [86, 54],
    [20, -92],
  ]
    .map(([dx, dy], i) => star([c[0] + dx, c[1] + dy], 7 + ((f + i) % 3) * 2))
    .join("");
  return [
    bench(),
    `<clipPath id="roundClip"><circle cx="${c[0]}" cy="${c[1]}" r="62"/></clipPath>`,
    `<g clip-path="url(#roundClip)"><rect x="${c[0] - 62}" y="${c[1] - 6}" width="124" height="70" fill="url(#plate)" fill-opacity=".55"/></g>`,
    circle(c, 62, BLUE.pale, 1.8),
    path(`M${c[0] - 14} 126V${c[1] - 60}M${c[0] + 14} 126V${c[1] - 60}`, BLUE.pale, 1.8),
    poly(
      [
        [286, 82],
        [354, 82],
        [334, 118],
        [306, 118],
      ],
      "url(#hull)",
      BLUE.pale,
      1.6,
    ),
    drops,
    path(`M${c[0] - 56} ${c[1] - 6}Q${c[0]} ${c[1] + 4} ${c[0] + 56} ${c[1] - 6}`, "#ffffff", 1.4),
    clover,
    path(`M${c[0]} ${c[1] + 20}q4 12 10 18`, BLUE.pale, 1.6),
    bubbles(c[0], c[1] + 46, c[1] + 4, 34, f, 6, 92),
    sparks,
    reticle(c, 84 + (f % 2) * 2, f),
    callout([c[0] + 62, c[1] - 24], [452, 126], "FORTUNE"),
  ].join("");
}

export function fury(f: number): string {
  const push = [0, 6, 12, 6][f];
  const bolt = path(
    "M380 80L338 170L366 176L318 290",
    BLUE.light,
    3,
    "none",
    `opacity="${f % 2 ? 0.9 : 0.5}"`,
  );
  let shards = "";
  for (let i = 0; i < 7; i++) {
    const x = -40 + i * 16 + (hash(i, 1, 93) - 0.5) * 10 + push * 0.4;
    const y = (hash(i, 2, 93) - 0.5) * 22;
    shards += poly(
      [
        [x, y - 6],
        [x + 7, y + 2],
        [x - 2, y + 7],
      ],
      BLUE.light,
      BLUE.pale,
      0.9,
    );
  }
  const syringe = [
    `<rect x="${-60 + push}" y="-22" width="${140 - push}" height="44" fill="url(#plate)" fill-opacity=".5"/>`,
    `<rect x="-120" y="-22" width="200" height="44" rx="4" fill="none" stroke="${BLUE.pale}" stroke-width="1.8"/>`,
    `<rect x="${-66 + push}" y="-20" width="8" height="40" fill="${BLUE.pale}"/>`,
    line([-66 + push, 0], [-190 + push, 0], BLUE.pale, 3),
    `<rect x="${-204 + push}" y="-16" width="14" height="32" rx="4" fill="none" stroke="${BLUE.pale}" stroke-width="2"/>`,
    `<rect x="-128" y="-34" width="8" height="68" rx="2" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.4"/>`,
    poly(
      [
        [80, -8],
        [150, -1.5],
        [150, 1.5],
        [80, 8],
      ],
      BLUE.pale,
      BLUE.pale,
      1,
    ),
    ...[-100, -80, -20, 20, 60].map((x) => line([x, -22], [x, -14], BLUE.mid, 1)),
    shards,
  ].join("");
  let squirt = "";
  for (let i = 0; i < 4; i++) {
    const phase = ((f + i) % 4) / 4;
    squirt += circle(
      [318 + 40 + phase * 40, 226 - 40 * 0.3 + (i % 2) * 6 - phase * 8],
      2 - phase,
      BLUE.pale,
      1,
      BLUE.pale,
    );
  }
  return [
    bench(),
    bolt,
    `<g transform="translate(300 214) rotate(-16)">${syringe}</g>`,
    // the vial of ground chitin beside it
    `<rect x="116" y="248" width="46" height="64" rx="8" fill="url(#plate)" fill-opacity=".45" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    poly(
      [
        [126, 296],
        [134, 282],
        [142, 296],
      ],
      BLUE.light,
      BLUE.pale,
      1,
    ),
    poly(
      [
        [142, 300],
        [150, 288],
        [156, 300],
      ],
      BLUE.light,
      BLUE.pale,
      1,
    ),
    squirt,
    reticle([284, 218], 54 + (f % 2) * 2, f),
    callout([410, 198], [452, 128], "FURY"),
  ].join("");
}

export function quicksilver(f: number): string {
  const x = 320;
  let helix = "";
  for (const phase of [0, Math.PI]) {
    let d = "";
    for (let y = 176; y <= 292; y += 6)
      d += `${d ? "L" : "M"}${(x + 15 * Math.sin(y / 11 + f * 1.4 + phase)).toFixed(1)} ${y}`;
    helix += path(d, BLUE.pale, 1.8);
  }
  const blobY = 196 + [0, 4, 8, 4][f];
  return [
    bench(),
    // stand and clamp
    line([420, BENCH], [420, 100], BLUE.light, 2.4),
    line([344, 150], [420, 150], BLUE.light, 2),
    `<rect x="384" y="${BENCH - 6}" width="72" height="6" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.2"/>`,
    `<clipPath id="tubeClip"><path d="M296 110V280Q296 306 320 306Q344 306 344 280V110Z"/></clipPath>`,
    `<g clip-path="url(#tubeClip)"><rect x="296" y="170" width="48" height="140" fill="url(#plate)" fill-opacity=".5"/></g>`,
    path("M296 110V280Q296 306 320 306Q344 306 344 280V110", BLUE.pale, 1.8),
    path("M290 110h60", BLUE.pale, 2.4),
    helix,
    `<ellipse cx="${x}" cy="${blobY}" rx="${10 + (f % 2) * 2}" ry="8" fill="url(#crystal)" stroke="#ffffff" stroke-width="1.2"/>`,
    crystal(306, 304, 22, 5, -8),
    crystal(322, 305, 30, 6, 4),
    crystal(336, 304, 20, 5, 10),
    bubbles(x, 300, 176, 14, f, 5, 94),
    reticle([x, 232], 64 + (f % 2) * 2, f),
    callout([344, 200], [452, 128], "QUICKSILVER"),
  ].join("");
}

export function windfall(f: number): string {
  const c: Pt = [320, 258];
  let shimmer = "";
  for (let i = 0; i < 3; i++) {
    const sway = Math.sin(rad(f * 90 + i * 80)) * 6;
    shimmer += path(
      `M${304 + i * 16} 118q${-6 + sway} -16 0 -30t0 -30`,
      BLUE.light,
      1.4,
      "none",
      'opacity=".7"',
    );
  }
  let spore = circle(c, 15, BLUE.pale, 1.4, BLUE.light, 'fill-opacity=".5"');
  for (let i = 0; i < 14; i++) {
    const a = rad(i * (360 / 14));
    spore += line(
      [c[0] + Math.cos(a) * 15, c[1] + Math.sin(a) * 15],
      [c[0] + Math.cos(a) * 24, c[1] + Math.sin(a) * 24],
      BLUE.pale,
      1.2,
    );
  }
  let dissolve = "";
  for (let i = 0; i < 12; i++) {
    const phase = ((f + hash(i, 1, 95) * 4) % 4) / 4;
    const a = rad(hash(i, 2, 95) * 360);
    const d = 22 + phase * 36;
    dissolve += circle(
      [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d * 0.8],
      1.4,
      BLUE.pale,
      1,
      BLUE.pale,
      `opacity="${(1 - phase).toFixed(2)}"`,
    );
  }
  const sparks = [
    [-92, -52],
    [96, -30],
    [90, 40],
    [-84, 34],
  ]
    .map(([dx, dy], i) => star([c[0] + dx, c[1] + dy], 6 + ((f + i) % 3) * 2))
    .join("");
  return [
    bench(),
    `<clipPath id="bulbClip"><ellipse cx="${c[0]}" cy="${c[1]}" rx="70" ry="54"/></clipPath>`,
    `<g clip-path="url(#bulbClip)"><rect x="${c[0] - 70}" y="${c[1] - 14}" width="140" height="80" fill="url(#plate)" fill-opacity=".6"/></g>`,
    `<ellipse cx="${c[0]}" cy="${c[1]}" rx="70" ry="54" fill="none" stroke="${BLUE.pale}" stroke-width="1.8"/>`,
    path(`M${c[0] - 14} 132V${c[1] - 52}M${c[0] + 14} 132V${c[1] - 52}`, BLUE.pale, 1.8),
    poly(
      [
        [296, 118],
        [344, 118],
        [334, 134],
        [306, 134],
      ],
      "url(#hull)",
      BLUE.pale,
      1.6,
    ),
    path(
      `M${c[0] - 64} ${c[1] - 14}Q${c[0]} ${c[1] - 6} ${c[0] + 64} ${c[1] - 14}`,
      "#ffffff",
      1.4,
    ),
    `<circle cx="${c[0]}" cy="${c[1]}" r="${(30 + f * 3).toFixed(1)}" fill="url(#flare)" opacity=".5"/>`,
    spore,
    dissolve,
    shimmer,
    sparks,
    reticle(c, 82 + (f % 2) * 2, f),
    callout([c[0] + 70, c[1] - 36], [452, 126], "WINDFALL"),
  ].join("");
}

export function berserker(f: number): string {
  const off = [0, 8, 18, 8][f];
  const squash = 1 - off / 70;
  const core: Pt = [320, 252];
  const rim: Pt[] = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const r = 22 + hash(i, 1, 96) * 10;
    return [core[0] + Math.cos(a) * r * (1 + (1 - squash)), core[1] + Math.sin(a) * r * squash];
  });
  let cracks = "";
  for (let i = 0; i < 5; i++) {
    const a = rad(i * 72 + 20);
    cracks += line(
      core,
      [core[0] + Math.cos(a) * 30, core[1] + Math.sin(a) * 24 * squash],
      "#ffffff",
      1,
      'opacity=".9"',
    );
  }
  const drip = [0, 1, 2, 3]
    .map((i) =>
      circle([392 + ((f + i) % 4) * 3, 280 + ((f + i) % 4) * 6], 2, BLUE.pale, 1, BLUE.pale),
    )
    .join("");
  return [
    bench(),
    // the press
    `<rect x="228" y="84" width="16" height="${BENCH - 84}" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.4"/>`,
    `<rect x="396" y="84" width="16" height="${BENCH - 84}" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.4"/>`,
    `<rect x="228" y="84" width="184" height="22" rx="3" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    `<rect x="312" y="106" width="16" height="${96 + off - 106 + 70}" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.2"/>`,
    `<rect x="286" y="${178 + off}" width="68" height="14" rx="2" fill="url(#plate)" fill-opacity=".8" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    `<rect x="272" y="284" width="96" height="14" rx="2" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    `<circle cx="${core[0]}" cy="${core[1]}" r="${(40 + f * 3).toFixed(1)}" fill="url(#flare)" opacity=".5"/>`,
    poly(rim, "url(#crystal)", "#ffffff", 1.4),
    cracks,
    // the pressed extract and the other jar
    path("M368 288Q392 288 396 312", BLUE.pale, 1.6),
    drip,
    `<rect x="424" y="262" width="40" height="50" rx="6" fill="url(#plate)" fill-opacity=".5" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    poly(
      [
        [140, 252],
        [182, 252],
        [190, 270],
        [190, 306],
        [132, 306],
        [132, 270],
      ],
      "url(#hull)",
      BLUE.light,
      1.4,
    ),
    `<rect x="140" y="240" width="42" height="12" rx="2" fill="none" stroke="${BLUE.mid}" stroke-width="1.2"/>`,
    circle([150, 282], 3, BLUE.pale, 1, f % 3 ? BLUE.pale : "none"),
    circle([170, 282], 3, BLUE.pale, 1, f % 3 ? BLUE.pale : "none"),
    reticle(core, 58 + (f % 2) * 2, f),
    callout([360, 236], [452, 126], "BERSERKER"),
    text(132, 328, 8, "DO NOT OPEN", BLUE.mid, 'letter-spacing="1"'),
  ].join("");
}
