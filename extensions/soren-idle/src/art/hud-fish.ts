import { BLUE, circle, line, P, path, poly, Pt } from "./hud";
import { arm } from "./hud-scenes";
import { at, bolt, card, glow, rad, Scene, sparks, wave } from "./hud-kit";

const LAKE = 196;

/** The water: a bright surface line and rippling bands below it. */
function lake(f: number): string {
  let out = line([60, LAKE], [580, LAKE], BLUE.pale, 1.8);
  for (let i = 0; i < 6; i++) {
    const y = LAKE + 22 + i * 24;
    let d = `M${70 + i * 12} ${y}`;
    for (let x = 70 + i * 12; x < 560 - i * 14; x += 40) d += `q20 ${wave(f, x / 40 + i) * 6} 40 0`;
    out += path(d, BLUE.line, 1, "none", `opacity="${(0.7 - i * 0.09).toFixed(2)}"`);
  }
  return out;
}

/** A rod and a line down to a float, with the line running on to the catch. */
function rod(f: number, to: Pt): string {
  const bob = wave(f, 1) * 3;
  const tip: Pt = [214, LAKE + bob];
  return [
    path(`M470 80Q340 120 ${P(tip)}`, BLUE.pale, 1),
    circle([tip[0], tip[1] - 2], 5, BLUE.pale, 1.4, BLUE.bg),
    line([tip[0], tip[1] + 4], to, BLUE.light, 0.9, 'stroke-dasharray="4 4"'),
    arm([470, 80], true),
  ].join("");
}

const body = (fill = "url(#crystal)") => `fill="${fill}" fill-opacity=".8" stroke="${BLUE.pale}" stroke-width="1.4"`;
const eye = (x: number, y: number, r = 3) => circle([x, y], r, "#ffffff", 1, "#ffffff");

function school(f: number): string {
  let out = "";
  for (let i = 0; i < 7; i++) {
    const x = -60 + (i % 4) * 34 - (i > 3 ? 17 : 0) + wave(f, i) * 4;
    const y = (i > 3 ? 28 : -4) + wave(f, i + 2) * 3;
    out += `<path d="M-14 0Q0 -9 14 0Q0 9 -14 0Z" ${body()} transform="translate(${x} ${y})"/>`;
    out += poly(
      [
        [x - 14, y],
        [x - 24, y - 6 + wave(f, i) * 2],
        [x - 24, y + 6 + wave(f, i) * 2],
      ],
      "url(#hull)",
      BLUE.light,
      1,
    );
  }
  return out;
}

function eel(f: number): string {
  let d = "M-110 0";
  for (let i = 1; i <= 8; i++) d += `L${-110 + i * 26} ${Math.sin(rad(i * 55 + f * 90)) * 16}`;
  let out = path(d, BLUE.pale, 12, "none", 'opacity=".25"') + path(d, "#ffffff", 2.2);
  out += path(d, BLUE.light, 7, "none", 'opacity=".6"');
  out += eye(94, Math.sin(rad(8 * 55 + f * 90)) * 16 - 3, 3);
  for (let i = 0; i < 4; i++) out += bolt([-60 + i * 50, -24], [-60 + i * 50 + 16, -50 - (i % 2) * 10], f + i, 2, i);
  return out;
}

function ray(f: number): string {
  const flap = wave(f, 0) * 10;
  let out = poly(
    [
      [0, -8],
      [70, -34 + flap],
      [110, 0],
      [70, 34 - flap],
      [0, 8],
      [-70, 28 - flap],
      [-100, 0],
      [-70, -28 + flap],
    ],
    "url(#crystal)",
    BLUE.pale,
    1.5,
    'fill-opacity=".75"',
  );
  out += path(`M0 0Q-120 ${10 + flap} -170 ${wave(f, 2) * 18}`, BLUE.light, 2);
  out +=
    line([0, -8], [0, 8], BLUE.deep, 1) +
    circle([62, -4], 3, "#ffffff", 1, "#ffffff") +
    circle([62, 6], 3, "#ffffff", 1, "#ffffff");
  for (let i = -2; i <= 2; i++)
    out += circle([-30 + i * 24, 0], 3, "#ffffff", 0.8, "#ffffff", `opacity="${0.4 + 0.5 * ((i + f) % 2)}"`);
  return out + glow([0, 0], 120, 0.25);
}

function lurker(f: number): string {
  const jaw = 8 + (f % 2) * 6;
  let out = poly(
    [
      [-90, 10],
      [-60, -30],
      [10, -44],
      [70, -20],
      [96, 0],
      [96, 4 + jaw],
      [30, 22 + jaw],
      [-40, 28],
    ],
    "url(#hull)",
    BLUE.pale,
    1.6,
  );
  out += poly(
    [
      [96, 4 + jaw],
      [30, 22 + jaw],
      [-10, 16 + jaw],
      [30, 8 + jaw],
    ],
    "none",
    BLUE.light,
    1.2,
  );
  for (let i = 0; i < 6; i++) {
    out += poly(
      [
        [24 + i * 12, 2],
        [30 + i * 12, 14],
        [18 + i * 12, 14],
      ],
      "#ffffff",
      "#ffffff",
      0.5,
    );
    out += poly(
      [
        [24 + i * 12, 14 + jaw],
        [30 + i * 12, 4 + jaw],
        [36 + i * 12, 14 + jaw],
      ],
      "#ffffff",
      "#ffffff",
      0.5,
    );
  }
  out += circle([50, -22], 7, "#ffffff", 1.4, BLUE.bg) + circle([50, -22], 3, "#ffffff", 1, "#ffffff");
  out += poly(
    [
      [-90, 10],
      [-130, -20 + wave(f) * 6],
      [-130, 40 + wave(f) * 6],
    ],
    "url(#hull)",
    BLUE.light,
    1.2,
  );
  return out;
}

function leviathan(f: number): string {
  // a tail the size of a cliff breaking the surface, and the one scale you got
  const lift = wave(f, 0) * 6;
  let out = path(
    `M-30 ${LAKE - 285}C-30 -90 -140 -170 -200 ${-170 + lift}C-120 -120 -90 -40 -30 40Z`,
    BLUE.pale,
    1.6,
    "url(#hull)",
  );
  out += path(
    `M30 ${LAKE - 285}C30 -90 140 -170 200 ${-170 + lift}C120 -120 90 -40 30 40Z`,
    BLUE.pale,
    1.6,
    "url(#hull)",
  );
  out += path("M-30 40Q0 30 30 40V160H-30Z", BLUE.pale, 1.6, "url(#hull)");
  for (let i = 0; i < 4; i++) out += path(`M${-24 + i * 12} 60q-4 40 0 90`, BLUE.mid, 1);
  // the scale
  const s = [
    [-52, -4],
    [0, -40],
    [52, -4],
    [34, 44],
    [-34, 44],
  ] as Pt[];
  out += poly(
    s.map(([x, y]): Pt => [x + 270, y + 80]),
    "url(#plate)",
    "#ffffff",
    1.8,
  );
  out += path("M270 40V124M244 70L296 70", BLUE.deep, 1, "none", 'opacity=".6"');
  return out;
}

function crab(f: number): string {
  const snap = wave(f, 0) * 8;
  let out = `<ellipse cx="0" cy="0" rx="58" ry="40" ${body("url(#hull)")}/>`;
  for (const k of [-1, 1]) {
    out +=
      path(`M${k * 50} -14Q${k * 90} -30 ${k * 96} ${-56 - snap}`, BLUE.pale, 3.5) +
      poly(
        [
          [k * 96, -56 - snap],
          [k * 126, -74],
          [k * 120, -40],
          [k * 96, -44 + snap],
        ],
        "url(#crystal)",
        BLUE.pale,
        1.4,
      );
    for (let i = 0; i < 3; i++)
      out += path(`M${k * 40} ${8 + i * 10}L${k * (70 + i * 8)} ${30 + i * 12 + wave(f, i + k) * 3}`, BLUE.light, 2);
    out += circle([k * 16, -34], 4, "#ffffff", 1.2, "#ffffff") + line([k * 16, -34], [k * 16, -26], BLUE.pale, 1.4);
  }
  return out + path("M-30 -6Q0 8 30 -6", BLUE.mid, 1);
}

function pike(f: number): string {
  let out = poly(
    [
      [-150, 0],
      [-120, -8],
      [20, -16],
      [140, -4],
      [160, 0],
      [140, 6],
      [20, 14],
      [-120, 8],
    ],
    "url(#crystal)",
    BLUE.pale,
    1.5,
    'fill-opacity=".75"',
  );
  out += poly(
    [
      [-150, 0],
      [-185, -22 + wave(f) * 5],
      [-180, 0],
      [-185, 22 + wave(f) * 5],
    ],
    "url(#hull)",
    BLUE.light,
    1.2,
  );
  out +=
    poly(
      [
        [-30, -14],
        [-10, -34],
        [10, -14],
      ],
      "url(#hull)",
      BLUE.light,
      1.1,
    ) + eye(130, -2, 2.6);
  out += path("M-110 0H120", BLUE.deep, 1, "none", 'stroke-dasharray="8 6"');
  out += bolt([-40, -200 + 120], [-10, -20], f, 5, 9);
  return out + sparks([-10, -20], 40, f, 5, 4);
}

function angler(f: number): string {
  const sway = wave(f, 0) * 14;
  let out = `<ellipse cx="0" cy="0" rx="70" ry="52" ${body("url(#hull)")}/>`;
  out += poly(
    [
      [40, 6],
      [70, 20],
      [20, 32],
      [-10, 12],
    ],
    "none",
    BLUE.light,
    1.2,
  );
  for (let i = 0; i < 6; i++)
    out += poly(
      [
        [18 + i * 9, 6],
        [22 + i * 9, 18],
        [26 + i * 9, 6],
      ],
      "#ffffff",
      "#ffffff",
      0.5,
    );
  out +=
    path(`M20 -48Q${40 + sway} -110 ${70 + sway} -96`, BLUE.pale, 2) +
    circle([70 + sway, -96], 11, "#ffffff", 1.6, "url(#flare)") +
    glow([70 + sway, -96], 60, 0.5);
  out += circle([36, -14], 8, "#ffffff", 1.4, BLUE.bg) + circle([38, -14], 3, "#ffffff", 1, "#ffffff");
  return (
    out +
    poly(
      [
        [-70, 0],
        [-110, -24],
        [-110, 24],
      ],
      "url(#hull)",
      BLUE.light,
      1.2,
    )
  );
}

function carp(f: number): string {
  const tail = wave(f) * 6;
  const facets: Pt[][] = [
    [
      [-90, 0],
      [-40, -34],
      [-10, 0],
    ],
    [
      [-40, -34],
      [20, -40],
      [-10, 0],
    ],
    [
      [20, -40],
      [80, 0],
      [-10, 0],
    ],
    [
      [-90, 0],
      [-40, 34],
      [-10, 0],
    ],
    [
      [-40, 34],
      [20, 40],
      [-10, 0],
    ],
    [
      [20, 40],
      [80, 0],
      [-10, 0],
    ],
  ];
  let out = facets
    .map((p, i) => poly(p, "url(#crystal)", BLUE.pale, 1.1, `fill-opacity="${(0.4 + 0.1 * ((i + f) % 4)).toFixed(2)}"`))
    .join("");
  out += poly(
    [
      [-90, 0],
      [-130, -26 + tail],
      [-120, 0],
      [-130, 26 + tail],
    ],
    "url(#hull)",
    BLUE.pale,
    1.2,
  );
  out += eye(60, -6, 3.2);
  return out + sparks([-10, -2], 100, f, 8, 2);
}

function serpent(f: number): string {
  let d = "M-130 40";
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const p: Pt = [-130 + i * 22, 20 + Math.sin(rad(i * 50 + f * 90)) * 30];
    pts.push(p);
    d += `L${P(p)}`;
  }
  let out = path(d, BLUE.pale, 14, "none", 'opacity=".3"') + path(d, "url(#crystal)", 10) + path(d, "#ffffff", 1.6);
  pts.forEach((p, i) => i % 2 && (out += line(p, [p[0], p[1] - 14], BLUE.pale, 1.4)));
  out +=
    poly(
      [
        [134, 20],
        [170, 0],
        [180, 30],
        [140, 40],
      ],
      "url(#hull)",
      BLUE.pale,
      1.5,
    ) + eye(158, 18, 3);
  return out + bolt([100, -170], [150, -10], f, 5, 5) + bolt([-60, -170], [-30, 0], f + 1, 4, 8);
}

function whale(f: number): string {
  const dip = wave(f, 0) * 6;
  let out = path(
    `M-190 10Q-120 -70 20 -50Q150 -40 190 ${-6 + dip}Q150 60 20 56Q-120 64 -190 10Z`,
    BLUE.pale,
    1.6,
    "url(#hull)",
  );
  out += path(
    `M-190 10Q-230 ${-30 + dip * 2} -250 ${-50 + dip * 2}Q-210 ${-8 + dip * 2} -190 10Q-230 ${44 - dip * 2} -250 ${64 - dip * 2}Q-210 ${28} -190 10`,
    BLUE.pale,
    1.4,
    "url(#hull)",
  );
  out += path("M-120 30Q0 66 120 30", BLUE.mid, 1) + circle([140, -6], 4, "#ffffff", 1, "#ffffff");
  for (let i = 0; i < 3; i++)
    out += circle([40, -80 - i * 6], 14 + i * 16 + (f % 2) * 3, BLUE.light, 1, "none", `opacity="${0.8 - i * 0.2}"`);
  return out;
}

/** Moon over the water for the whale. */
const moonOver = (f: number) =>
  circle([480, 100], 30, BLUE.pale, 1.6, "url(#flare)", 'fill-opacity=".8"') +
  glow([480, 100], 70, 0.25) +
  (f % 2 ? "" : sparks([480, 100], 50, f, 4));

type Fish = [string, (f: number) => string, [number, number, number], number, string];
const FISH: Record<string, Fish> = {
  fish_minnow: ["LAKE MINNOWS", school, [330, 282, 1], 0, ""],
  fish_eel: ["SPARK EELS", eel, [330, 290, 1], 0, ""],
  fish_ray: ["GLOW RAYS", ray, [330, 284, 0.9], 0, ""],
  fish_lurker: ["MIRE LURKERS", lurker, [340, 290, 1.1], 0, ""],
  fish_leviathan: ["TIDE LEVIATHAN", leviathan, [250, LAKE - 20, 0.55], 0, ""],
  fish_crab: ["REEF CRABS", crab, [330, 300, 1], 0, ""],
  fish_pike: ["THUNDER PIKE", pike, [350, 290, 1], 0, ""],
  fish_angler: ["ABYSS ANGLERS", angler, [320, 290, 1.1], 0, ""],
  fish_carp: ["CRYSTAL CARP", carp, [340, 290, 1.2], 0, ""],
  fish_serpent: ["STORM SERPENTS", serpent, [350, 280, 1], 0, ""],
  fish_whale: ["LUNAR WHALES", whale, [340, 270, 0.9], 0, ""],
};

export const FISH_SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(FISH).map(([id, [label, draw, [x, y, s]]]) => [
    id,
    (f: number) => {
      const sway = id === "fish_leviathan" ? 0 : wave(f, 3) * 5;
      const sub = at(x + sway, y, s, 0, draw(f));
      const glowAt: Pt = [x, y];
      return (
        lake(f) +
        (id === "fish_whale" ? moonOver(f) : "") +
        glow(glowAt, 110, 0.22) +
        sub +
        rod(f, [x + 40, y - 10]) +
        card("", label, [x, y], f, 80)
      );
    },
  ]),
);
