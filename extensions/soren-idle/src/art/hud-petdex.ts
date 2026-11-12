import { BLUE, circle, line, P, path, poly, Pt, renderHud, text } from "./hud";
import { at, card, glow, rad, sparks, wave } from "./hud-kit";
import { PETS } from "../engine/data";
import { hash } from "./util";

/**
 * The pets the Collection Log shows, one per skill. Each is drawn around the origin, about 130 wide
 * with its feet at y = 50, then set on a small specimen stage with a callout naming it.
 */

// --- brushes ----------------------------------------------------------------

/** An eye with a dark pupil and a catchlight, so a face looks back at you. */
const eye = (c: Pt, r = 4) =>
  circle(c, r, "#ffffff", 1, "#ffffff") +
  circle([c[0] + r * 0.3, c[1] + r * 0.1], r * 0.58, BLUE.bg, 1, BLUE.bg) +
  circle([c[0] + r * 0.55, c[1] - r * 0.3], r * 0.22, "#ffffff", 0.5, "#ffffff");
const ell = (c: Pt, rx: number, ry: number, fill = "url(#hull)", stroke: string = BLUE.pale, w = 1.6, extra = "") =>
  `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
const hull = (pts: Pt[], fill = "url(#hull)", w = 1.6) => poly(pts, fill, BLUE.pale, w);
/** A thin panel line, and a bright highlight along an edge. */
const seam = (d: string, o = 0.75) => path(d, BLUE.mid, 1, "none", `opacity="${o}"`);
const glint = (d: string) => path(d, "#ffffff", 1.4, "none", 'opacity=".75"');
const rivets = (pts: Pt[]) => pts.map((p) => circle(p, 1.5, BLUE.pale, 0.8, BLUE.bg)).join("");
/** A jointed leg ending in a foot pad. */
const limb = (a: Pt, k: Pt, b: Pt, w = 3, color: string = BLUE.light) =>
  line(a, k, color, w) +
  line(k, b, color, w) +
  circle(k, w * 0.7, BLUE.pale, 0.9, BLUE.bg) +
  poly(
    [
      [b[0] - 5, b[1] - 2],
      [b[0] + 8, b[1] - 2],
      [b[0] + 5, b[1] + 2],
      [b[0] - 5, b[1] + 2],
    ],
    "url(#plate)",
    BLUE.pale,
    0.9,
  );
const star = (c: Pt, outer: number, inner: number, spin = 0, fill = "#ffffff") => {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    pts.push([c[0] + Math.cos(rad(i * 36 - 90 + spin)) * r, c[1] + Math.sin(rad(i * 36 - 90 + spin)) * r]);
  }
  return poly(pts, fill, "#ffffff", 0.6);
};
/** Little wisps drifting up from a point. */
const wisps = (c: Pt, f: number, n = 3, h = 34) => {
  let out = "";
  for (let i = 0; i < n; i++) {
    const t = ((f + i * 1.3) % 4) / 4;
    out += path(
      `M${c[0] + i * 10 - 10} ${c[1] - t * h}q6 -8 0 -16`,
      BLUE.light,
      1.4,
      "none",
      `opacity="${(0.75 - t * 0.6).toFixed(2)}"`,
    );
  }
  return out;
};

// --- the pets ---------------------------------------------------------------

const DRAW: Record<string, (f: number) => string> = {
  salvaging: (f) => {
    let out = "";
    for (let i = 0; i < 4; i++)
      out += limb([-38 + i * 24, 36], [-30 + i * 24, 46], [-34 + i * 24 + wave(f, i) * 5, 55], 2, BLUE.dim);
    out += ell([0, 16], 62, 32);
    for (const x of [-38, -14, 10, 34]) out += seam(`M${x} -12Q${x + 12} 16 ${x - 2} 46`);
    out += hull(
      [
        [-46, 2],
        [-32, -8],
        [-22, 4],
        [-36, 14],
      ],
      "url(#rock)",
      1,
    );
    out += hull(
      [
        [16, 26],
        [34, 18],
        [44, 30],
        [26, 38],
      ],
      "url(#rock)",
      1,
    );
    out += hull(
      [
        [-20, -24],
        [8, -28],
        [16, -14],
        [-12, -10],
      ],
      "url(#plate)",
      1.4,
    );
    out +=
      path("M-6 -26L-2 -18L-8 -12", BLUE.bg, 1.2) +
      rivets([
        [-14, -20],
        [10, -22],
        [-8, -12],
      ]);
    out += rivets([
      [-44, -4],
      [-40, 30],
      [40, -8],
      [48, 14],
    ]);
    out += glint("M-46 6Q-26 -14 12 -16");
    out += ell([66, 22], 21, 18);
    out +=
      circle([68, 12], 8, BLUE.pale, 1.2, BLUE.bg) +
      path("M61 12H75M68 5V19", BLUE.mid, 0.8) +
      circle([71, 9], 2, "#ffffff", 0.5, "#ffffff");
    out += hull(
      [
        [80, 24],
        [96, 16],
        [90, 32],
      ],
      "url(#plate)",
      1.2,
    );
    out += hull(
      [
        [80, 32],
        [96, 40],
        [86, 42],
      ],
      "url(#plate)",
      1.2,
    );
    out += hull(
      [
        [94, 24],
        [112, 20],
        [114, 34],
        [96, 36],
      ],
      "url(#plate)",
      1.2,
    );
    out += path("M104 22L108 28L102 34", BLUE.bg, 1.2) + sparks([106, 26], 14, f, 3, 2);
    out += path(`M72 5Q${88 + wave(f) * 4} -14 ${100 + wave(f) * 6} -12`, BLUE.pale, 1.8);
    out +=
      circle([100 + wave(f) * 6, -12], 2.4, "#ffffff", 0.5, "#ffffff") +
      circle([86 + wave(f) * 3, -7], 1.6, BLUE.pale, 0.6, BLUE.pale);
    for (let i = 0; i < 4; i++)
      out += limb([-32 + i * 24, 40], [-22 + i * 24, 47], [-26 + i * 24 + wave(f, i + 2) * 5, 55], 3);
    return out;
  },
  mining: (f) => {
    let out = "";
    for (let i = 0; i < 3; i++)
      out += limb([-34 + i * 32, 36], [-26 + i * 32, 46], [-30 + i * 32 + wave(f, i) * 4, 55], 2, BLUE.dim);
    out += glow([-4, -40], 40, 0.5);
    out += path("M-68 38Q-62 -42 6 -44Q68 -42 72 38Z", BLUE.pale, 1.6, "url(#rock)");
    out +=
      seam("M4 -44Q8 -2 2 38") +
      seam("M-44 -18L-16 -10L-10 16L-40 24Z") +
      seam("M-16 -10L14 -16L22 12L-10 16") +
      seam("M30 -12L52 -4L54 22L26 18Z");
    out += rivets([
      [-52, 8],
      [-30, 30],
      [40, 30],
      [58, 12],
    ]);
    for (const [x, h, w] of [
      [-34, 24, 9],
      [-14, 38, 11],
      [8, 30, 8],
      [28, 42, 12],
      [48, 22, 8],
    ] as const) {
      out += hull(
        [
          [x - w, -22],
          [x - 2, -22 - h],
          [x + w, -22],
        ],
        "url(#crystal)",
        1.3,
      );
      out += path(`M${x} -22L${x - 2} ${-22 - h}M${x} -22L${x + 3} ${-22 - h * 0.55}`, BLUE.light, 0.9);
    }
    out += star([28, -72 - wave(f) * 3], 5, 2, f * 20) + sparks([8, -52], 30, f, 5, 3);
    out += path(
      "M-68 38L-62 30L-54 40L-44 31L-34 41L-22 32L-10 41L2 33L14 42L26 33L38 41L50 33L62 41L72 38",
      BLUE.pale,
      1.4,
      "url(#rock)",
    );
    out += hull([
      [60, 6],
      [90, 12],
      [92, 38],
      [60, 38],
    ]);
    out += path("M88 10Q104 -6 100 -22", BLUE.pale, 2.6) + path("M90 18Q112 8 114 -8", BLUE.pale, 2.6);
    out += eye([78, 20], 4.2) + seam("M64 24H84") + circle([88, 30], 1.6, BLUE.bg, 1, BLUE.bg);
    out +=
      path(`M70 6Q76 ${-8 + wave(f) * 3} 84 ${-12 + wave(f) * 4}`, BLUE.pale, 1.6) +
      circle([84, -12 + wave(f) * 4], 3, BLUE.pale, 1, "url(#crystal)");
    for (let i = 0; i < 3; i++)
      out += limb([-28 + i * 32, 40], [-18 + i * 32, 47], [-22 + i * 32 + wave(f, i + 2) * 4, 55], 3.4);
    return out;
  },
  foraging: (f) => {
    const sway = wave(f) * 8;
    const tx = sway * 1.4;
    let out = "";
    out += path(`M0 -36Q${sway} -54 ${tx} -72`, BLUE.pale, 2.6);
    for (const k of [-1, 1]) {
      out += hull(
        [
          [tx, -72],
          [tx + k * 26, -88],
          [tx + k * 34, -66],
          [tx + k * 6, -58],
        ],
        "url(#plate)",
      );
      out +=
        path(`M${tx} -72L${tx + k * 28} -74`, BLUE.pale, 1) +
        path(`M${tx + k * 12} -73L${tx + k * 16} -64M${tx + k * 20} -74L${tx + k * 26} -68`, BLUE.mid, 0.8);
    }
    out += circle([tx, -74], 4.6, BLUE.pale, 1.2, "url(#crystal)");
    out += ell([0, 8], 44, 42);
    out += ell([0, 20], 26, 22, "url(#plate)", BLUE.light, 1, 'opacity=".55"');
    for (const [x, y, r] of [
      [-26, -2, 4],
      [24, -10, 3],
      [30, 18, 3.4],
      [-30, 24, 3],
    ] as const)
      out += circle([x, y], r, BLUE.mid, 1, "none", 'opacity=".8"');
    for (const k of [-1, 1]) {
      out += hull(
        [
          [k * 34, -16],
          [k * 66, -38 + wave(f, k) * 5],
          [k * 54, -2],
        ],
        "url(#crystal)",
        1.3,
      );
      out += path(`M${k * 38} -14L${k * 60} -32`, BLUE.light, 0.9);
      out += leg2([k * 40, 14], [k * 62, 22 + wave(f, k + 1) * 5]);
      out += circle([k * 64, 23 + wave(f, k + 1) * 5], 4.4, BLUE.pale, 1.2, "url(#plate)");
      out += limb([k * 14, 46], [k * 18, 51], [k * 18, 56], 3);
    }
    out += eye([-15, -2], 5) + eye([15, -2], 5);
    out +=
      ell([-27, 10], 6, 3.4, BLUE.light, "none", 0, 'opacity=".35"') +
      ell([27, 10], 6, 3.4, BLUE.light, "none", 0, 'opacity=".35"');
    out += path("M-8 14Q0 24 8 14", BLUE.pale, 2);
    for (let i = 0; i < 3; i++) {
      const t = ((f + i * 1.4) % 4) / 4;
      out += circle(
        [-50 + i * 50 + wave(f, i) * 5, -20 - t * 50],
        2 + (i % 2),
        BLUE.pale,
        0.8,
        BLUE.pale,
        `opacity="${(0.9 - t * 0.7).toFixed(2)}"`,
      );
    }
    return out;
  },
  cooking: (f) => {
    let out = "";
    const flick = [1, 1.4, 0.9, 1.25][f];
    out += path("M-62 30Q-100 26 -108 -4Q-104 -22 -90 -8", BLUE.pale, 7);
    out += path("M-62 30Q-100 26 -108 -4Q-104 -22 -90 -8", "url(#hull)", 4);
    for (const [s, c] of [
      [1, "url(#plate)"],
      [0.72, "url(#crystal)"],
      [0.4, "#ffffff"],
    ] as const)
      out += poly(
        [
          [-90, -8],
          [-98 + wave(f) * 3, -8 - 26 * flick * s],
          [-82, -8 - 12 * flick * s],
          [-78 + wave(f, 2) * 3, -8 - 32 * flick * s],
          [-70, -6],
        ],
        c,
        BLUE.pale,
        1.2,
      );
    out += wisps([-86, -34], f, 2, 30);
    for (let i = 0; i < 4; i++)
      out += limb(
        [-36 + i * 30, 40],
        [-30 + i * 30, 48],
        [-34 + i * 30 + wave(f, i) * 4, 55],
        i % 2 ? 3 : 2,
        i % 2 ? BLUE.light : BLUE.dim,
      );
    out += ell([-6, 24], 64, 25);
    for (let x = -56; x <= 40; x += 12)
      out += poly(
        [
          [x, -2],
          [x + 6, -12],
          [x + 12, -2],
        ],
        "url(#plate)",
        BLUE.pale,
        1,
      );
    for (let x = -50; x <= 44; x += 10) out += seam(`M${x} 30Q${x + 4} 38 ${x + 10} 30`, 0.6);
    for (const [x, y] of [
      [-44, 16],
      [-18, 12],
      [10, 14],
      [34, 18],
    ] as const)
      out += circle([x, y], 2.6, BLUE.pale, 1, "url(#flare)");
    out += glint("M-52 14Q-20 4 30 12");
    out += hull([
      [48, 6],
      [80, 8],
      [94, 22],
      [90, 34],
      [50, 36],
    ]);
    out +=
      hull(
        [
          [56, 6],
          [64, -8],
          [72, 6],
        ],
        "url(#plate)",
        1.2,
      ) +
      hull(
        [
          [66, 6],
          [76, -4],
          [80, 8],
        ],
        "url(#plate)",
        1.2,
      );
    out += eye([72, 16], 4.4) + circle([90, 20], 1.4, BLUE.bg, 1, BLUE.bg) + path("M60 30Q76 34 90 28", BLUE.bg, 1.2);
    if (f % 2) out += path("M92 30L108 32M108 32L114 28M108 32L114 36", BLUE.pale, 1.6);
    return out;
  },
  engineering: (f) => {
    let out = "";
    out += path("M-62 30Q-96 44 -112 14", BLUE.pale, 6) + path("M-62 30Q-96 44 -112 14", "url(#hull)", 3);
    for (const [x, y] of [
      [-72, 36],
      [-86, 36],
      [-98, 30],
    ] as const)
      out += seam(`M${x} ${y - 6}L${x - 2} ${y + 6}`, 0.9);
    out +=
      hull(
        [
          [-120, 8],
          [-104, 4],
          [-100, 20],
          [-114, 20],
        ],
        "url(#plate)",
        1.2,
      ) + circle([-110, 12], 2.4, BLUE.bg, 1, BLUE.bg);
    for (const x of [-30, 30]) out += limb([x, 36], [x + 8, 46], [x + wave(f, x) * 6, 55], 3.4);
    out += ell([-4, 22], 64, 24);
    out +=
      seam("M-60 22Q-4 12 60 22") +
      rivets([
        [-50, 14],
        [-30, 8],
        [30, 8],
        [50, 14],
        [-40, 36],
        [40, 36],
      ]);
    out += hull([
      [52, 4],
      [88, 6],
      [94, 26],
      [54, 34],
    ]);
    out +=
      poly(
        [
          [56, 8],
          [88, 10],
          [90, 18],
          [58, 16],
        ],
        "#0b1e44",
        BLUE.pale,
        1,
      ) + path("M60 13H86", "#ffffff", 1.6, "none", `opacity="${f % 2 ? 1 : 0.5}"`);
    out += eye([76, 24], 4) + circle([76, 24], 6.4, BLUE.mid, 0.8);
    out += path("M20 -10Q48 -22 56 8", BLUE.mid, 1.2, "none", 'stroke-dasharray="3 3"');
    const gear = (cx: number, cy: number, r: number, teeth: number, deg: number) => {
      let pts = "";
      for (let i = 0; i < teeth; i++) {
        for (const [da, rr] of [
          [-0.22, r],
          [0.22, r],
          [0.28, r * 0.78],
          [0.72, r * 0.78],
        ] as const) {
          const a = rad((i + da) * (360 / teeth) + deg);
          pts += `${P([Math.cos(a) * rr, Math.sin(a) * rr])} `;
        }
      }
      return `<g transform="translate(${cx} ${cy})"><polygon points="${pts}" fill="url(#plate)" stroke="${BLUE.pale}" stroke-width="1.4"/>${circle([0, 0], r * 0.34, BLUE.pale, 1.4, BLUE.bg)}${circle([0, 0], r * 0.6, BLUE.mid, 0.8)}</g>`;
    };
    out += gear(-12, -10, 28, 10, f * 9) + gear(26, -30, 15, 7, -f * 9 + 12);
    out += sparks([14, -16], 16, f, 3, 4);
    return out;
  },
  fabrication: (f) => {
    const flap = [-30, 2, 30, 2][f];
    let out = "";
    // the anvil it perches on
    out +=
      hull(
        [
          [-34, 50],
          [34, 50],
          [40, 58],
          [-40, 58],
        ],
        "url(#rock)",
        1.4,
      ) +
      hull(
        [
          [-44, 44],
          [44, 44],
          [30, 50],
          [-30, 50],
        ],
        "url(#plate)",
        1.4,
      );
    out += path("M44 44L64 40L44 50", BLUE.pale, 1.4) + seam("M-30 47H30");
    out += sparks([6, 40], 26, f, 6, 7);
    // three tail feathers fanned out from the rump, each with a quill
    for (const [i, c] of ["url(#plate)", "url(#hull)", "url(#crystal)"].entries()) {
      const tip: Pt = [-104, -4 + i * 20 + flap * 0.15];
      out += hull(
        [
          [-42, 8 + i * 8],
          [tip[0], tip[1] - 5],
          [tip[0] - 6, tip[1] + 2],
          [tip[0], tip[1] + 7],
          [-42, 16 + i * 8],
        ],
        c,
        1.3,
      );
      out += seam(`M-44 ${12 + i * 8}L${tip[0] + 4} ${tip[1] + 1}`);
    }
    out += limb([-8, 34], [-10, 40], [-10, 46], 2.8) + limb([10, 34], [12, 40], [12, 46], 2.8);
    out += ell([0, 6], 50, 36);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++)
        out += path(`M${-8 + c * 12 - r * 4} ${6 + r * 9}q4 5 8 0`, BLUE.mid, 1, "none", 'opacity=".8"');
    for (const [dx, dy, c] of [
      [0, 0, "url(#plate)"],
      [-8, 8, "url(#hull)"],
      [-14, 16, "url(#crystal)"],
    ] as const)
      out += hull(
        [
          [-22 + dx, 2 + dy],
          [-60 + dx + flap * 0.2, -26 + dy + flap * 0.8],
          [-12 + dx, -4 + dy + flap * 0.4],
          [16 + dx, 12 + dy],
        ],
        c,
        1.3,
      );
    out += hull([
      [40, -20],
      [56, -30],
      [74, -20],
      [64, -4],
      [44, -6],
    ]);
    for (const [x, h] of [
      [44, 22],
      [54, 30],
      [62, 24],
    ] as const)
      out += hull(
        [
          [x - 4, -24],
          [x, -24 - h * 0.5],
          [x + 6, -26],
        ],
        "url(#plate)",
        1.1,
      );
    const open = f % 2 ? 7 : 2;
    out +=
      hull(
        [
          [74, -20],
          [98, -12 - open * 0.5],
          [74, -12],
        ],
        "url(#plate)",
        1.2,
      ) +
      hull(
        [
          [74, -10],
          [94, -6 + open],
          [72, -6],
        ],
        "url(#crystal)",
        1.1,
      );
    out += eye([62, -14], 3.8);
    return out;
  },
  combat: (f) => {
    const wag = wave(f) * 14;
    let out = "";
    out +=
      path(`M-64 8Q-90 ${-6 + wag} -84 ${-34 + wag}`, BLUE.pale, 7) +
      path(`M-64 8Q-90 ${-6 + wag} -84 ${-34 + wag}`, "url(#hull)", 4);
    for (let i = 0; i < 3; i++) out += seam(`M${-76 - i * 3} ${-6 - i * 8 + wag * 0.5}l8 -2`, 0.9);
    for (const x of [-46, 24]) out += limb([x, 26], [x + 4, 40], [x + wave(f, x) * 4, 55], 3, BLUE.dim);
    out += ell([-4, 12], 66, 27);
    out += hull(
      [
        [-62, 8],
        [-44, -20],
        [-20, -24],
        [-16, 8],
      ],
      "url(#plate)",
      1.4,
    );
    out += hull(
      [
        [-22, 8],
        [-4, -24],
        [22, -22],
        [24, 8],
      ],
      "url(#hull)",
      1.4,
    );
    out += hull(
      [
        [18, 8],
        [34, -22],
        [56, -16],
        [52, 8],
      ],
      "url(#plate)",
      1.4,
    );
    for (const x of [-38, -4, 36])
      out += hull(
        [
          [x - 5, -20],
          [x, -32],
          [x + 5, -20],
        ],
        "url(#crystal)",
        1.1,
      );
    out += rivets([
      [-48, -4],
      [-30, -14],
      [-8, -14],
      [10, -10],
      [28, -10],
      [44, -6],
    ]);
    out += path("M-12 -10L-6 -2L-12 8", BLUE.bg, 1.2);
    for (const x of [-30, 2, 40]) out += limb([x, 28], [x + 6, 41], [x + wave(f, x + 2) * 4, 55], 4);
    out += hull([
      [48, -18],
      [86, -14],
      [98, 8],
      [88, 26],
      [50, 28],
    ]);
    out +=
      hull(
        [
          [50, -18],
          [58, -50],
          [74, -16],
        ],
        "url(#plate)",
        1.3,
      ) +
      hull(
        [
          [40, -2],
          [26, 6],
          [30, 26],
          [44, 22],
        ],
        "url(#plate)",
        1.2,
      );
    out += hull(
      [
        [58, -20],
        [90, -16],
        [90, -8],
        [58, -10],
      ],
      "url(#plate)",
      1.2,
    );
    out += eye([76, -1], 4) + path("M66 -10L84 -8", BLUE.bg, 2);
    out += circle([98, 8], 4, BLUE.pale, 1, BLUE.pale);
    out += path("M84 22Q90 28 98 22", BLUE.bg, 1.4) + path("M88 22L90 28L92 22M94 22L96 27L98 21", "#ffffff", 1.2);
    out += circle([42, 26], 4, BLUE.pale, 1, "url(#crystal)") + path("M42 22V30", BLUE.bg, 1);
    out += path("M60 -6L68 6", BLUE.mid, 1.4);
    return out;
  },
  xenochemistry: (f) => {
    let out = "";
    out += hull(
      [
        [-24, -58],
        [24, -58],
        [24, -34],
        [52, 24],
        [52, 50],
        [-52, 50],
        [-52, 24],
        [-24, -34],
      ],
      "none",
    );
    out += seam("M-18 -34L-46 22", 0.5) + glint("M-30 6L-44 30");
    for (let i = 0; i < 5; i++) out += line([42 - i * 3, -4 + i * 13], [50 - i * 3, -4 + i * 13], BLUE.pale, 1.2);
    out += text(-8, -4, 8, "XC-7", BLUE.mid, 'opacity=".9"');
    out +=
      hull(
        [
          [-14, -70],
          [14, -70],
          [14, -58],
          [-14, -58],
        ],
        "url(#plate)",
        1.4,
      ) + seam("M-10 -66H10");
    out += wisps([0, -72], f, 3, 30);
    out += path(
      `M-48 50Q-50 ${14 + wave(f) * 3} 0 ${12 + wave(f, 2) * 3}Q50 ${14 + wave(f) * 3} 48 50Z`,
      BLUE.pale,
      1.4,
      "url(#hull)",
    );
    out += path(
      `M-46 50Q-46 ${22 + wave(f) * 2} 0 ${20 + wave(f, 2) * 2}Q46 ${22 + wave(f) * 2} 46 50Z`,
      BLUE.pale,
      1.4,
      "url(#plate)",
    );
    out += ell([0, 34], 20, 15, "url(#crystal)", BLUE.light, 1, 'opacity=".5"');
    out += eye([-14, 30], 5) + eye([14, 30], 5) + path("M-6 40Q0 45 6 40", BLUE.bg, 2);
    out += path("M-22 21Q-22 28 -20 33", "#ffffff", 1.3, "none", 'opacity=".6"');
    for (let i = 0; i < 5; i++) {
      const t = ((f + i * 0.9) % 4) / 4;
      out += circle(
        [-30 + i * 15 + wave(f, i) * 2, 12 - t * 48],
        2 + (i % 3) * 0.8,
        BLUE.pale,
        1,
        "none",
        `opacity="${(1 - t).toFixed(2)}"`,
      );
    }
    out += path("M52 24Q58 36 54 48", BLUE.light, 1.6, "none", 'opacity=".6"');
    out += circle([54, 50 + (f % 2) * 2], 2, BLUE.pale, 1, BLUE.pale);
    return out;
  },
  xenofishing: (f) => {
    const tail = wave(f) * 12;
    let out = "";
    out += hull(
      [
        [-54, 0],
        [-100, -30 + tail],
        [-90, 4],
        [-100, 34 + tail],
      ],
      "url(#plate)",
    );
    for (let i = -2; i <= 2; i++)
      out += seam(`M-56 ${i * 3}L${-94 + Math.abs(i) * 2} ${i * 12 + tail * Math.sign(i || 1) * 0.6}`, 0.8);
    out += ell([0, 0], 58, 35);
    out += ell([4, 14], 44, 15, "url(#plate)", BLUE.light, 1, 'opacity=".45"');
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 6; c++)
        out += path(`M${-44 + c * 14 + (r % 2) * 7} ${-16 + r * 11}q6 5 0 10`, BLUE.mid, 0.9, "none", 'opacity=".7"');
    out += hull(
      [
        [-18, -32],
        [-10, -56 - wave(f, 2) * 3],
        [0, -34],
        [12, -60 - wave(f, 3) * 3],
        [26, -30],
      ],
      "url(#plate)",
      1.3,
    );
    for (const x of [-8, 6, 18]) out += seam(`M${x} -32L${x + 2} -48`);
    out += hull(
      [
        [-6, 26],
        [10, 46 + wave(f, 3) * 3],
        [28, 24],
      ],
      "url(#plate)",
      1.3,
    );
    out += path("M30 -14Q36 0 30 14", BLUE.pale, 1.8) + path("M24 -12Q29 0 24 12", BLUE.mid, 1.2);
    out += path("M58 6Q42 14 38 4", BLUE.bg, 2);
    for (const x of [44, 50, 55])
      out += poly(
        [
          [x, 5],
          [x + 2, 11],
          [x + 4, 5],
        ],
        "#ffffff",
        "#ffffff",
        0.4,
      );
    out += eye([38, -8], 6) + circle([38, -8], 8.6, BLUE.mid, 0.8);
    for (let i = 0; i < 7; i++)
      out += circle(
        [-40 + i * 16, 2 + wave(f, i) * 1.5],
        1.6,
        "#ffffff",
        0.5,
        "#ffffff",
        `opacity="${i % 2 === f % 2 ? 1 : 0.4}"`,
      );
    out += path("M34 -34Q60 -66 90 -42", BLUE.pale, 2);
    for (const [x, y] of [
      [46, -52],
      [60, -62],
      [74, -62],
    ] as const)
      out += circle([x, y], 1.6, BLUE.pale, 0.8, BLUE.bg);
    out += glow([90, -42], 26, 0.85) + circle([90, -42], 5.4, "#ffffff", 1, "#ffffff");
    for (let i = 0; i < 3; i++) {
      const t = ((f + i) % 4) / 4;
      out += circle(
        [66 + i * 8, 6 - t * 50],
        2 + i * 0.5,
        BLUE.pale,
        0.9,
        "none",
        `opacity="${(0.9 - t * 0.8).toFixed(2)}"`,
      );
    }
    return out;
  },
  smelting: (f) => {
    const arms = wave(f) * 8;
    let out = "";
    out +=
      path("M-30 30Q-64 46 -56 14", BLUE.pale, 4) +
      hull(
        [
          [-62, 14],
          [-50, 8],
          [-52, 20],
        ],
        "url(#plate)",
        1.2,
      ) +
      hull(
        [
          [-56, 10],
          [-44, 4],
          [-44, 14],
        ],
        "url(#plate)",
        1.1,
      );
    for (const k of [-1, 1]) {
      out += hull(
        [
          [k * 24, -36],
          [k * 40, -70],
          [k * 40, -32],
        ],
        "url(#plate)",
        1.3,
      );
      for (const y of [-44, -54, -62]) out += seam(`M${k * 26} ${y}L${k * 36} ${y - 2}`);
      out += hull(
        [
          [k * 36, -30],
          [k * 62, -40],
          [k * 50, -22],
        ],
        "url(#hull)",
        1.2,
      );
      out += limb([k * 30, -4], [k * 48, -14 + arms * k], [k * 64, -30 + arms * k], 4);
      out += limb([k * 16, 36], [k * 24, 46], [k * 22, 55], 4);
    }
    out +=
      circle([64, -34 + arms], 5, BLUE.pale, 1.2, "url(#plate)") +
      circle([-64, -34 - arms], 5, BLUE.pale, 1.2, "url(#plate)");
    out +=
      hull(
        [
          [-70, -42 - arms],
          [-56, -48 - arms],
          [-52, -40 - arms],
          [-66, -36 - arms],
        ],
        "url(#plate)",
        1.2,
      ) + seam(`M-66 ${-42 - arms}H-56`);
    out += ell([0, 12], 38, 33);
    out += path(
      "M-22 -8L-14 2L-24 10M20 -10L12 0L22 8M-8 30L0 22L10 30",
      "#ffffff",
      1.2,
      "none",
      `opacity="${0.5 + 0.4 * (f % 2)}"`,
    );
    out +=
      ell([0, 16], 18, 15, "url(#flare)", BLUE.pale, 1.2, `opacity="${0.65 + 0.35 * (f % 2)}"`) +
      path(`M-8 16Q0 ${8 + wave(f) * 3} 8 16Q0 ${24 - wave(f) * 3} -8 16`, BLUE.pale, 1);
    out += ell([0, -28], 34, 28);
    out += path("M-24 -38L-8 -32M24 -38L8 -32", BLUE.bg, 3);
    out += eye([-13, -28], 4.2) + eye([13, -28], 4.2);
    out +=
      path(`M-18 -14Q0 ${2 + wave(f) * 3} 18 -14Z`, BLUE.bg, 1.6) +
      path("M-12 -14L-9 -8L-6 -14M6 -14L9 -8L12 -14", "#ffffff", 1.1);
    out += sparks([0, -78], 26, f, 4, 9) + wisps([-30, -66], f, 2, 24);
    return out;
  },
  hacking: (f) => {
    let out = "";
    const flap = [1, 0.7, 0.5, 0.8][f];
    const glitch = f % 2 ? 7 : 0;
    for (const k of [-1, 1]) {
      for (const [row, w, y0] of [
        [0, 84, -38],
        [1, 62, -2],
      ] as const) {
        const x1 = k * (10 + w * flap);
        out += hull(
          [
            [k * 10, y0],
            [x1, y0 - 10],
            [x1, y0 + 30],
            [k * 10, y0 + 32],
          ],
          "url(#hull)",
          1.4,
        );
        for (let i = 1; i < 5; i++)
          out += line(
            [k * (10 + (w * flap * i) / 5), y0 - 8 + i * 1.6],
            [k * (10 + (w * flap * i) / 5), y0 + 30],
            BLUE.dim,
            0.8,
          );
        // circuit traces and pads across each wing
        const a = k * (16 + w * flap * 0.25);
        const b = k * (16 + w * flap * 0.62);
        out += path(`M${k * 14} ${y0 + 16}H${a}V${y0 + 6}H${b}V${y0 + 22}H${x1 - k * 6}`, BLUE.pale, 1.1);
        out += circle([b, y0 + 22], 2.4, "#ffffff", 0.6, "#ffffff") + circle([a, y0 + 6], 1.8, BLUE.pale, 0.7, BLUE.bg);
        if (row === 0)
          for (let i = 0; i < 6; i++)
            out += `<rect x="${Math.min(a, x1) + hash(i, k, 3) * Math.abs(x1 - a)}" y="${y0 + 22 + hash(i, 2, k) * 6}" width="3" height="3" fill="${BLUE.light}" opacity="${f % 2 === i % 2 ? 0.9 : 0.4}"/>`;
      }
    }
    out += ell([0, 0], 11, 42);
    for (let i = 0; i < 6; i++) out += path(`M-10 ${-28 + i * 12}q10 4 20 0`, BLUE.mid, 1, "none", 'opacity=".7"');
    out += ell([0, -40], 9, 9) + eye([0, -41], 4);
    for (const k of [-1, 1]) {
      out += path(`M${k * 4} -46Q${k * 14} -62 ${k * 22} -70`, BLUE.pale, 1.8);
      for (let i = 0; i < 4; i++)
        out += line([k * (8 + i * 3.4), -52 - i * 5], [k * (14 + i * 3.4), -56 - i * 5], BLUE.mid, 1);
      out += circle([k * 22, -70], 2.4, "#ffffff", 0.5, "#ffffff");
    }
    if (glitch)
      out +=
        ell([glitch, 0], 11, 42, "none", BLUE.line, 1, 'opacity=".5"') +
        `<rect x="-90" y="${-14 + f * 4}" width="180" height="5" fill="${BLUE.line}" opacity=".35"/>`;
    for (let i = 0; i < 5; i++) {
      const t = ((f + i * 0.8) % 4) / 4;
      out += text(
        -74 + i * 36,
        46 - t * 100,
        9,
        hash(i, f) > 0.5 ? "1" : "0",
        BLUE.mid,
        `opacity="${(0.8 - t * 0.7).toFixed(2)}"`,
      );
    }
    return out;
  },
  exploration: (f) => {
    const hop = [0, -10, -16, -6][f];
    let out = "";
    for (let i = 0; i < 2; i++)
      out += ell([-104 - i * 20, 54], 6, 2.4, "none", BLUE.mid, 1.2, `opacity="${0.8 - i * 0.18}"`);
    out += `<g transform="translate(0 ${hop})">`;
    out +=
      path(`M-30 -8Q${-62 - wave(f) * 6} ${-30 - wave(f, 1) * 4} ${-94 - wave(f) * 8} ${-14}`, BLUE.pale, 9) +
      path(`M-30 -8Q${-62 - wave(f) * 6} ${-30 - wave(f, 1) * 4} ${-94 - wave(f) * 8} ${-14}`, "url(#plate)", 6);
    out += ell([-58, 12], 15, 15, "url(#plate)");
    for (const [x, y] of [
      [-70, 4],
      [-66, 22],
      [-52, 26],
    ] as const)
      out += path(`M${x} ${y}l-5 -3M${x} ${y}l-5 2`, BLUE.pale, 1);
    out +=
      hull([
        [-40, 26],
        [-14, 52],
        [-60, 52],
      ]) + seam("M-44 40H-22");
    out += ell([-6, 10], 56, 27);
    for (const [x, y] of [
      [-30, 20],
      [-10, 28],
      [14, 22],
      [34, 14],
    ] as const)
      out += path(`M${x} ${y}l-4 5M${x + 4} ${y}l-4 5`, BLUE.mid, 1, "none", 'opacity=".7"');
    out += hull(
      [
        [-30, -14],
        [4, -18],
        [8, 4],
        [-26, 8],
      ],
      "url(#hull)",
      1.4,
    );
    out +=
      hull(
        [
          [-26, -26],
          [-6, -28],
          [-6, -16],
          [-26, -14],
        ],
        "url(#plate)",
        1.2,
      ) + path("M-22 -22L-8 -24", BLUE.bg, 3);
    out +=
      path("M-30 -6L-48 -14M4 -4L12 6", BLUE.pale, 2) +
      rivets([
        [-28, 0],
        [2, -2],
      ]);
    out += `<g transform="translate(24 4)">${circle([0, 0], 8, BLUE.pale, 1.4, BLUE.bg)}${path("M0 -6L2 0L0 6L-2 0Z", "#ffffff", 1, "#ffffff")}</g>`;
    out += limb([30, 28], [44, 40], [58, 52], 4);
    out += hull([
      [40, -4],
      [76, -10],
      [88, 12],
      [46, 22],
    ]);
    for (const [x, tilt] of [
      [50, -10],
      [66, 2],
    ] as const) {
      out += hull(
        [
          [x, -6],
          [x + tilt - 6, -40],
          [x + tilt + 8, -38],
          [x + 12, -8],
        ],
        "url(#crystal)",
        1.3,
      );
      out += path(`M${x + 5} -8L${x + tilt + 1} -34`, BLUE.pale, 1.2, "none", 'opacity=".7"');
    }
    out +=
      hull(
        [
          [44, -2],
          [64, -8],
          [66, 2],
          [46, 6],
        ],
        "url(#plate)",
        1.2,
      ) +
      circle([54, -2], 4, BLUE.pale, 1, BLUE.bg) +
      circle([64, -2], 4, BLUE.pale, 1, BLUE.bg);
    out += eye([72, 4], 3.8) + circle([88, 10], 2.4, BLUE.pale, 1, BLUE.pale);
    out += path("M84 12L106 8M84 14L106 18", BLUE.pale, 1);
    out += `</g>`;
    return out;
  },
  companions: (f) => {
    const spin = [1, 0.4, -1, -0.4][f];
    let out = "";
    out += line([0, -44], [0, -62], BLUE.pale, 2.6) + circle([0, -64], 3, BLUE.pale, 1.2, BLUE.bg);
    for (const k of [-1, 1]) {
      out += path(`M${k * 4 - 38 * spin} -66L${k * 4 + 38 * spin} -66`, "#ffffff", 3, "none", 'opacity=".9"');
      out += path(`M${-40 * spin} -70Q0 -78 ${40 * spin} -70`, BLUE.mid, 1, "none", 'opacity=".4"');
    }
    for (const k of [-1, 1]) {
      out +=
        path(`M${k * 30} -38Q${k * 40} -64 ${k * 24} -70`, BLUE.pale, 1.8) +
        circle([k * 24, -72], 5, BLUE.pale, 1.2, "url(#crystal)");
    }
    out += ell([0, 0], 52, 46);
    out +=
      path("M-52 0Q0 14 52 0", BLUE.mid, 1.2, "none", 'stroke-dasharray="4 4"') +
      path("M0 -46Q12 0 0 46", BLUE.mid, 1.2, "none", 'stroke-dasharray="4 4"');
    for (let i = 0; i < 6; i++)
      out += path(
        `M${-48 + i * 4} ${-18 + i * 7}l4 3M${-48 + i * 4} ${-15 + i * 7}l4 -3`,
        BLUE.mid,
        0.9,
        "none",
        'opacity=".8"',
      );
    out +=
      hull(
        [
          [16, 12],
          [40, 12],
          [40, 34],
          [16, 34],
        ],
        "url(#plate)",
        1.2,
      ) + path("M19 15H37V31H19Z", BLUE.bg, 0.9, "none", 'stroke-dasharray="2 2"');
    out += path(
      "M28 30L20 23Q18 18 24 18Q28 18 28 22Q28 18 32 18Q38 18 36 23Z",
      "#ffffff",
      1,
      "#ffffff",
      'opacity=".9"',
    );
    for (const x of [-18, 18]) {
      out += circle([x, -10], 8, BLUE.pale, 1.6, BLUE.bg) + circle([x, -10], 3.6, BLUE.dim, 1, BLUE.dim);
      out += line([x - 5, -15], [x + 5, -5], BLUE.pale, 1.2) + line([x - 5, -5], [x + 5, -15], BLUE.pale, 1.2);
      out += circle([x + 2, -12], 1.4, "#ffffff", 0.4, "#ffffff");
    }
    out += path("M-12 12Q0 24 12 12", BLUE.pale, 1.8) + seam("M-6 18l-2 3M0 20v4M6 18l2 3", 0.9);
    for (const k of [-1, 1]) {
      out += hull(
        [
          [k * 48, 2],
          [k * 76, 6 + wave(f, k) * 6],
          [k * 68, 24],
          [k * 46, 18],
        ],
        "url(#plate)",
        1.3,
      );
      out += seam(`M${k * 60} ${8 + wave(f, k) * 4}l${k * 4} 14`, 0.9);
      out += hull(
        [
          [k * 14, 40],
          [k * 28, 40],
          [k * 26, 52],
          [k * 12, 52],
        ],
        "url(#hull)",
        1.3,
      );
      const fl = 6 + (f % 2) * 4;
      out += poly(
        [
          [k * 14, 52],
          [k * 20, 52 + fl * 2],
          [k * 26, 52],
        ],
        "url(#flare)",
        "none",
        0,
        'opacity=".9"',
      );
    }
    return out;
  },
  stargazing: (f) => {
    let out = "";
    for (let i = 0; i < 5; i++)
      out += path(
        `M-52 ${-10 + i * 11}Q${-112 - i * 10} ${-22 + i * 17 + wave(f, i) * 6} -136 ${-50 + i * 12}`,
        i % 2 ? BLUE.light : BLUE.pale,
        1.6,
        "none",
        `opacity="${0.85 - i * 0.12}"`,
      );
    for (let i = 0; i < 9; i++) {
      const t = ((f + i * 0.7) % 4) / 4;
      out += circle(
        [-70 - t * 90, -26 + hash(i, 1, 4) * 80],
        1.2 + hash(i, 2) * 1.8,
        "#ffffff",
        0.4,
        "#ffffff",
        `opacity="${(0.9 - t * 0.7).toFixed(2)}"`,
      );
    }
    for (let i = 0; i < 4; i++)
      out += limb(
        [-38 + i * 26, 34],
        [-34 + i * 26, 44],
        [-38 + i * 26 + wave(f, i) * 4, 55],
        i % 2 ? 4 : 3,
        i % 2 ? BLUE.light : BLUE.dim,
      );
    out += ell([-4, 14], 60, 29);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 8; c++)
        out += path(
          `M${-50 + c * 12 + (r % 2) * 5} ${4 + r * 10}l3 -4M${-47 + c * 12 + (r % 2) * 5} ${4 + r * 10}l3 4`,
          BLUE.mid,
          0.8,
          "none",
          'opacity=".45"',
        );
    const dots: Pt[] = [
      [-34, 6],
      [-16, 14],
      [4, 4],
      [24, 12],
      [38, 2],
    ];
    out += path(`M${dots.map(P).join("L")}`, BLUE.pale, 1, "none", 'opacity=".8"');
    for (const d of dots) out += circle(d, 2.6, "#ffffff", 0.5, "#ffffff");
    out += hull([
      [40, -10],
      [80, -8],
      [90, 14],
      [78, 30],
      [42, 30],
    ]);
    for (const x of [46, 70])
      out +=
        hull(
          [
            [x, -10],
            [x + 4, -38],
            [x + 16, -10],
          ],
          "url(#plate)",
          1.3,
        ) + path(`M${x + 6} -12L${x + 6} -28`, BLUE.pale, 1, "none", 'opacity=".6"');
    out +=
      eye([70, 4], 4.2) + circle([88, 14], 2.4, BLUE.pale, 1, BLUE.pale) + path("M84 20Q80 24 74 22", BLUE.bg, 1.2);
    out += path("M86 12L108 8M86 15L108 20", BLUE.pale, 1);
    out += star([58, -4], 9, 4, f * 12) + glow([58, -4], 18, 0.6);
    out +=
      path("M42 30Q58 38 76 30", BLUE.pale, 1.6) +
      path("M62 36A5 5 0 1 0 64 44A7 7 0 0 1 62 36", "#ffffff", 1, "#ffffff");
    for (let i = 0; i < 3; i++) {
      const a = rad(f * 30 + i * 120);
      out += star([20 + Math.cos(a) * 62, -30 + Math.sin(a) * 18], 4, 1.8, f * 20);
    }
    return out;
  },
};

/** A little two-segment arm used where limb() would add a foot. */
function leg2(a: Pt, b: Pt): string {
  return line(a, b, BLUE.light, 3.4);
}

/** The stage a pet stands on: a floor, a slow ring, and a specimen sheet beside it. */
function stage(skill: string, f: number, index: number): string {
  const pet = PETS[skill as keyof typeof PETS]!;
  const bob = wave(f, 1) * 3;
  let ring = "";
  for (let i = 0; i < 24; i++) {
    const a = rad(i * 15 + f * 7.5);
    const long = i % 6 === 0;
    ring += line(
      [320 + Math.cos(a) * 140, 190 + Math.sin(a) * 140],
      [320 + Math.cos(a) * (long ? 128 : 134), 190 + Math.sin(a) * (long ? 128 : 134)],
      BLUE.mid,
      long ? 1.6 : 1,
      'opacity=".8"',
    );
  }
  let motes = "";
  for (let i = 0; i < 9; i++) {
    const t = ((f + hash(i, 5) * 4) % 4) / 4;
    motes += circle(
      [210 + hash(i, 1, 7) * 220, 280 - t * 170],
      1 + hash(i, 2, 7) * 1.6,
      BLUE.pale,
      0.6,
      BLUE.pale,
      `opacity="${(0.7 - t * 0.6).toFixed(2)}"`,
    );
  }
  const sheet =
    text(52, 286, 9, `SPECIMEN ${String(index + 1).padStart(2, "0")}`, BLUE.pale, 'letter-spacing="1"') +
    text(52, 300, 8, `SOURCE  ${skill.toUpperCase()}`, BLUE.mid) +
    text(52, 312, 8, `BOND    +3% XP`, BLUE.mid) +
    text(52, 324, 8, `ODDS    1 IN 10000`, BLUE.mid);
  return (
    glow([320, 190], 160, 0.2) +
    ring +
    ell([320, 296], 170, 15, "none", BLUE.dim, 1, 'opacity=".9"') +
    ell([320, 296], 110, 9, "none", BLUE.dim, 1, 'opacity=".7"') +
    ell([320, 294], 80, 8, "#000000", "none", 0, 'opacity=".35"') +
    line([190, 292], [450, 292], BLUE.pale, 1.8) +
    line([220, 300], [420, 300], BLUE.mid, 1, 'opacity=".6"') +
    motes +
    at(320, 206 + bob, 1.6, 0, DRAW[skill](f)) +
    card("", pet.name.toUpperCase(), [330, 100], f, 100, [440, 80]) +
    sheet
  );
}

/** A frame of each pet's picture, by skill id. */
export const PET_ART: Record<string, (frame: number) => string> = Object.fromEntries(
  Object.keys(DRAW).map((skill, i) => [
    skill,
    (frame: number) => renderHud((f) => stage(skill, f, i), frame, 211 + i * 2),
  ]),
);
