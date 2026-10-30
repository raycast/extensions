import { BLUE, circle, line, P, path, poly, Pt, text } from "./hud";
import { arm, callout, crystal, sparks } from "./hud-scenes";
import { hash } from "./util";

const rad = (deg: number) => (deg * Math.PI) / 180;
const hull = (points: Pt[], stroke: string = BLUE.pale, w = 1.5) =>
  poly(points, "url(#hull)", stroke, w);
const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  r = 3,
  stroke: string = BLUE.pale,
  fill = "url(#hull)",
) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
const rot = (p: Pt, deg: number): Pt => {
  const a = rad(deg);
  return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
};

/** An oblique box: the front face at (x, y), depth d going up and right. */
function box(x: number, y: number, w: number, h: number, d: number): string {
  return [
    hull([
      [x, y],
      [x + d, y - d * 0.6],
      [x + w + d, y - d * 0.6],
      [x + w, y],
    ]),
    hull([
      [x + w, y],
      [x + w + d, y - d * 0.6],
      [x + w + d, y + h - d * 0.6],
      [x + w, y + h],
    ]),
    rect(x, y, w, h, 2),
  ].join("");
}

interface Item {
  name: string;
  /** Draws the item around the origin. */
  draw(f: number): string;
  /** Where the arm works, relative to the origin. */
  work: Pt;
}

// --- components --------------------------------------------------------------------

const alloy: Item = {
  name: "ALLOY PLATE",
  work: [30, -34],
  draw: (f) =>
    [
      box(-90, 24, 170, 22, 44),
      box(-82, 0, 154, 22, 44),
      box(-74, -24, 138, 22, 44),
      ...[-60, -20, 20, 60].map((x) => circle([x, -13], 2.4, BLUE.pale, 1, BLUE.bg)),
      `<ellipse cx="22" cy="-38" rx="70" ry="14" fill="url(#flare)" opacity="${[0.6, 0.8, 0.9, 0.7][f]}"/>`,
      ...[0, 1, 2].map((i) =>
        path(
          `M${-30 + i * 40} -52q${-6 + (f % 2) * 4} -12 0 -24`,
          BLUE.light,
          1.3,
          "none",
          'opacity=".7"',
        ),
      ),
    ].join(""),
};

const circuit: Item = {
  name: "CIRCUIT BOARD",
  work: [24, -6],
  draw: (f) => {
    const traces = [
      "M-84 -40H-40V-10H10",
      "M-84 0H-56V30H40",
      "M84 -40H50V-14",
      "M84 20H62V36",
      "M-30 44V20H-8",
      "M20 -54V-30H60",
    ];
    const dots = traces.map((d, i) => {
      const t = ((f + i * 1.3) % 4) / 4;
      const m = /M(-?\d+) (-?\d+)/.exec(d)!;
      return circle(
        [Number(m[1]) + (i % 2 ? -t * 40 : t * 40), Number(m[2])],
        2.6,
        "#ffffff",
        1,
        "#ffffff",
        `opacity="${(1 - t).toFixed(2)}"`,
      );
    });
    return [
      rect(-100, -62, 200, 124, 8),
      ...traces.map((d) => path(d, BLUE.light, 1.6)),
      rect(-26, -28, 52, 40, 3, BLUE.pale, "#143572"),
      ...Array.from(
        { length: 6 },
        (_, i) =>
          line([-20 + i * 8, -28], [-20 + i * 8, -34], BLUE.pale, 1.2) +
          line([-20 + i * 8, 12], [-20 + i * 8, 18], BLUE.pale, 1.2),
      ),
      rect(36, 22, 30, 22, 2, BLUE.pale, "#143572"),
      rect(-80, 34, 22, 14, 2, BLUE.pale, "#143572"),
      ...[
        [-90, -52],
        [90, -52],
        [-90, 52],
        [90, 52],
      ].map(([x, y]) => circle([x, y], 4, BLUE.pale, 1.2, BLUE.bg)),
      ...dots,
    ].join("");
  },
};

function gear(c: Pt, r: number, teeth: number, deg: number): string {
  const pts: Pt[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = rad(deg + (i * 180) / teeth);
    const d = i % 2 ? r * 0.78 : r;
    pts.push([c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]);
  }
  return hull(pts) + circle(c, r * 0.3, BLUE.pale, 1.4, BLUE.bg);
}

const servo: Item = {
  name: "SERVO UNIT",
  work: [74, -34],
  draw: (f) =>
    [
      rect(-106, -34, 108, 68, 10),
      `<ellipse cx="2" cy="0" rx="10" ry="34" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.5"/>`,
      ...[-80, -58, -36].map((x) => line([x, -30], [x, 30], BLUE.mid, 1.2)),
      line([10, 0], [58, 0], BLUE.pale, 4),
      gear([76, 0], 32, 10, f * 9),
      rect(-96, 46, 120, 12, 2),
      ...[-84, -60, -36, -12].map((x) => rect(x, 36, 14, 10, 1, BLUE.light, "#143572")),
      path("M24 52H60V30", BLUE.light, 1.4),
    ].join(""),
};

const powerCore: Item = {
  name: "POWER CORE",
  work: [40, -14],
  draw: (f) => {
    let coil = "";
    for (let i = 0; i < 10; i++) {
      const y = 36 - i * 9;
      const rx = 38 - Math.abs(i - 4.5) * 2 + ((f + i) % 2) * 0.8;
      coil += path(`M${-rx} ${y}A${rx} 9 0 0 0 ${rx} ${y}`, BLUE.pale, 1.8);
      coil += path(`M${-rx} ${y}A${rx} 9 0 0 1 ${rx} ${y}`, BLUE.mid, 1, "none", 'opacity=".5"');
    }
    return [
      box(-64, 44, 128, 14, 24),
      `<circle cx="0" cy="-8" r="${(50 + f * 3).toFixed(1)}" fill="url(#flare)" opacity=".5"/>`,
      crystal(0, 38, 92, 16, 0),
      coil,
    ].join("");
  },
};

const fusionCell: Item = {
  name: "FUSION CELL",
  work: [62, -44],
  draw: (f) => {
    const hex = Array.from({ length: 6 }, (_, i): Pt => [
      Math.cos(rad(i * 60 + 30)) * 76,
      Math.sin(rad(i * 60 + 30)) * 76,
    ]);
    const orbit = (k: number): Pt => [
      Math.cos(rad(f * 90 + k * 180)) * 24,
      Math.sin(rad(f * 90 + k * 180)) * 24,
    ];
    return [
      poly(hex, "none", BLUE.pale, 2),
      ...hex.map((p, i) => line(p, hex[(i + 1) % 6], BLUE.light, 5, 'opacity=".3"')),
      circle([0, 0], 44, BLUE.pale, 1.6, "#0b1e44"),
      `<circle cx="0" cy="0" r="${(40 + f * 3).toFixed(1)}" fill="url(#flare)"/>`,
      circle(orbit(0), 8, "#ffffff", 1.2, BLUE.light),
      circle(orbit(1), 8, "#ffffff", 1.2, BLUE.light),
      `<ellipse cx="0" cy="0" rx="94" ry="24" fill="none" stroke="${BLUE.light}" stroke-width="1.4" stroke-dasharray="12 8" stroke-dashoffset="${f * 8}" transform="rotate(-24)"/>`,
      rect(-30, 76, 60, 12, 2),
    ].join("");
  },
};

// --- tools -------------------------------------------------------------------------

function torch(f: number, arcTorch: boolean): string {
  const grow = [0, 6, 2, 8][f];
  let out = [
    path("M-110 0Q-134 44 -96 64", BLUE.light, 3),
    rect(-110, -12, 82, 24, 6),
    circle([-22, 0], 13, BLUE.pale, 1.5, BLUE.bg),
    line([-22, -13], [-22, -24], BLUE.pale, 3),
    rect(-30, -10, 50, 20, 3),
    hull([
      [20, -10],
      [62, -6],
      [62, 6],
      [20, 10],
    ]),
  ].join("");
  if (arcTorch) {
    for (let i = 0; i < 4; i++)
      out += `<ellipse cx="${24 + i * 10}" cy="0" rx="6" ry="${16 - i * 1.5}" fill="none" stroke="${BLUE.light}" stroke-width="1.6"/>`;
    let d = "M62 0";
    for (let i = 1; i <= 7; i++) d += `L${62 + i * 9} ${(hash(i, f, 111) - 0.5) * 22}`;
    out += path(d, BLUE.pale, 2.4) + path(d, BLUE.light, 7, "none", 'opacity=".35"');
  } else {
    out += path(
      `M62 -8Q${84 + grow} -12 ${110 + grow} 0Q${84 + grow} 12 62 8Z`,
      BLUE.pale,
      1.4,
      BLUE.light,
      'fill-opacity=".6"',
    );
    out += path(
      `M62 -4Q${76 + grow} -6 ${92 + grow} 0Q${76 + grow} 6 62 4Z`,
      "#ffffff",
      1,
      "#ffffff",
    );
  }
  return out;
}

const cuttingTorch: Item = { name: "CUTTING TORCH", work: [110, 0], draw: (f) => torch(f, false) };
const arcTorch: Item = { name: "ARC TORCH", work: [108, 0], draw: (f) => torch(f, true) };

function kit(f: number, deep: boolean): string {
  let out = [
    hull([
      [-100, -34],
      [-86, -72],
      [86, -72],
      [100, -34],
    ]),
    rect(-100, -34, 200, 94, 6),
    line([-34, -34], [-34, 60], BLUE.mid, 1.2),
    line([34, -34], [34, 60], BLUE.mid, 1.2),
    // blade
    poly(
      [
        [-86, 40],
        [-70, -18],
        [-50, 40],
      ],
      BLUE.light,
      BLUE.pale,
      1.2,
    ),
    // sample jars
    ...[-22, -4, 14].map(
      (x, i) =>
        rect(x, -6, 14, 54, 3, BLUE.pale, i === 1 ? "url(#plate)" : "url(#hull)") +
        rect(x - 1, -12, 16, 7, 1),
    ),
    // scanner
    rect(44, -16, 46, 66, 4),
    rect(50, -8, 34, 24, 2, BLUE.light, "#143572"),
    path(`M54 8l6-6l6 8l6-10l6 6`, "#ffffff", 1.2),
    line([84, -16], [96, -44], BLUE.pale, 2),
    circle([96, -46], 3, BLUE.pale, 1, BLUE.pale),
  ].join("");
  if (deep) {
    for (let i = 0; i < 3; i++) {
      const r = 14 + ((f + i * 1.3) % 4) * 9;
      out += `<circle cx="96" cy="-46" r="${r.toFixed(1)}" fill="none" stroke="${BLUE.pale}" stroke-width="1" opacity="${(0.9 - r / 50).toFixed(2)}"/>`;
    }
    out += [...Array(5)].map((_, i) => rect(-96 + i * 12, 64, 8, 20, 1, BLUE.light)).join("");
    out += path("M-100 -72Q0 -112 100 -72", BLUE.pale, 2.4);
  }
  return out;
}

const harvestKit: Item = { name: "HARVEST KIT", work: [-60, 8], draw: (f) => kit(f, false) };
const deepHarvester: Item = { name: "DEEP HARVESTER", work: [-60, 8], draw: (f) => kit(f, true) };

function drill(f: number, quantum: boolean): string {
  const half = (x: number) => 22 * (1 - x / 104);
  let bit = hull([
    [0, -22],
    [104, 0],
    [0, 22],
  ]);
  for (let k = 0; k < 5; k++) {
    const x = 6 + k * 20 + ((f * 5) % 20);
    if (x + 14 < 100) bit += line([x, -half(x)], [x + 14, half(x + 14)], BLUE.light, 1.6);
  }
  let out = [
    rect(-92, -28, 92, 56, 10),
    ...[-76, -62, -48, -34].map((x) => line([x, -22], [x, 22], BLUE.mid, 1.2)),
    hull([
      [-70, 28],
      [-48, 28],
      [-54, 70],
      [-80, 70],
    ]),
    circle([-34, 0], 9, BLUE.pale, 1.4, BLUE.bg),
  ].join("");
  if (quantum) {
    for (const d of [-14, 14])
      out += `<g opacity=".3" transform="translate(${d * 0.6} ${d})">${hull(
        [
          [0, -22],
          [104, 0],
          [0, 22],
        ],
        BLUE.light,
        1.2,
      )}</g>`;
    out += `<ellipse cx="52" cy="0" rx="${10 + (f % 2) * 2}" ry="44" fill="none" stroke="${BLUE.pale}" stroke-width="1.6" stroke-dasharray="10 6" stroke-dashoffset="${f * 6}"/>`;
  }
  out += bit;
  out += `<circle cx="106" cy="0" r="${(14 + f * 2).toFixed(1)}" fill="url(#flare)"/>`;
  return out;
}

const plasmaDrill: Item = { name: "PLASMA DRILL", work: [106, 0], draw: (f) => drill(f, false) };
const quantumDrill: Item = { name: "QUANTUM DRILL", work: [106, 0], draw: (f) => drill(f, true) };

// --- weapons -----------------------------------------------------------------------

function hilt(): string {
  return [
    rect(-106, -7, 52, 14, 5),
    circle([-108, 0], 9, BLUE.pale, 1.4, BLUE.bg),
    rect(-56, -22, 10, 44, 2),
  ].join("");
}

const TILT = -16;

function weapon(
  f: number,
  kind: "pulse" | "saber" | "cleaver" | "maul" | "fang" | "spore" | "thorn",
): string {
  let out = "";
  if (kind === "pulse" || kind === "saber") {
    const len = kind === "saber" ? 124 : 104;
    out += hilt();
    out += hull([
      [-46, -9],
      [len, -6],
      [len + 14, 0],
      [len, 6],
      [-46, 9],
    ]);
    out += line([-40, 0], [len - 6, 0], BLUE.mid, 1.2);
    if (kind === "pulse") {
      out += crystal(-51, -20, 30, 7, 0);
      for (const s of [-1, 1])
        out += path(
          `M-30 ${s * 16}q${20 + (f % 2) * 6} ${s * -6} 40 0t40 0t40 0`,
          BLUE.light,
          1.3,
          "none",
          'opacity=".7"',
        );
    } else {
      for (let x = -20; x < len - 20; x += 24)
        out += `<ellipse cx="${x}" cy="0" rx="6" ry="17" fill="none" stroke="${BLUE.light}" stroke-width="1.6"/>`;
      let d = `M-40 0`;
      for (let i = 1; i <= 16; i++) d += `L${-40 + i * 10} ${Math.sin(rad(i * 60 + f * 90)) * 9}`;
      out += path(d, "#ffffff", 1.4) + path(d, BLUE.light, 6, "none", 'opacity=".3"');
    }
  } else if (kind === "cleaver") {
    out += hilt();
    out += hull([
      [-46, -28],
      [92, -28],
      [112, -12],
      [112, 26],
      [-46, 26],
    ]);
    for (let i = 0; i < 5; i++)
      out += poly(
        [
          [-30 + i * 28, -28],
          [-18 + i * 28, -44 - (i % 2) * 8],
          [-6 + i * 28, -28],
        ],
        BLUE.light,
        BLUE.pale,
        1.2,
      );
    out += [...Array(4)]
      .map((_, i) => circle([-30 + i * 34, -14], 2.6, BLUE.pale, 1, BLUE.bg))
      .join("");
    out += line([-40, 10], [104, 10], BLUE.mid, 1.2);
  } else if (kind === "maul") {
    out += rect(-112, -5, 190, 10, 3);
    out += circle([-114, 0], 14, BLUE.pale, 1.6, "url(#hull)");
    out += rect(30, -46, 64, 92, 6);
    out += [...Array(3)]
      .map((_, i) => line([42, -30 + i * 30], [82, -30 + i * 30], BLUE.mid, 1.2))
      .join("");
    out += [-46, 46]
      .map((y) =>
        poly(
          [
            [40, y],
            [62, y + (y < 0 ? -18 : 18)],
            [84, y],
          ],
          BLUE.light,
          BLUE.pale,
          1.2,
        ),
      )
      .join("");
  } else if (kind === "fang") {
    out += hilt();
    out += path("M-44 -9Q60 -62 122 44Q50 -4 -44 9Z", BLUE.pale, 1.6, "url(#hull)");
    out += path("M-30 -2Q50 -34 104 30", BLUE.mid, 1.2);
    out += circle([-44, 0], 7, BLUE.pale, 1.4, BLUE.bg);
  } else if (kind === "spore") {
    out += rect(-112, -4, 150, 8, 3);
    out += circle([-114, 0], 8, BLUE.pale, 1.4, BLUE.bg);
    out += `<ellipse cx="62" cy="0" rx="34" ry="24" fill="url(#crystal)" fill-opacity=".8" stroke="${BLUE.pale}" stroke-width="1.6"/>`;
    out += [...Array(4)]
      .map((_, i) =>
        circle(
          [46 + i * 9, -8 + (i % 2) * 14],
          2.4,
          "#ffffff",
          1,
          "#ffffff",
          `opacity="${0.5 + 0.5 * ((f + i) % 2)}"`,
        ),
      )
      .join("");
    for (let i = 0; i < 8; i++) {
      const t = ((f + hash(i, 1, 112) * 4) % 4) / 4;
      out += circle(
        [62 + (hash(i, 2, 112) - 0.5) * 80, -26 - t * 40],
        1.4,
        BLUE.pale,
        1,
        BLUE.pale,
        `opacity="${(1 - t).toFixed(2)}"`,
      );
    }
  } else {
    out += rect(-112, -4, 150, 8, 3);
    out += circle([-114, 0], 8, BLUE.pale, 1.4, BLUE.bg);
    for (let x = -80; x < 40; x += 20) {
      out += poly(
        [
          [x - 4, -4],
          [x + 2, -16],
          [x + 8, -4],
        ],
        BLUE.light,
        BLUE.pale,
        1,
      );
      out += poly(
        [
          [x + 4, 4],
          [x + 10, 16],
          [x + 16, 4],
        ],
        BLUE.light,
        BLUE.pale,
        1,
      );
    }
    out += path(
      `M-100 0q${20} ${-12 + (f % 2) * 4} 40 0t40 0t40 0`,
      BLUE.light,
      1.4,
      "none",
      'opacity=".8"',
    );
    out += hull([
      [38, -12],
      [100, 0],
      [38, 12],
    ]);
    out += hull([
      [40, -10],
      [78, -34],
      [66, -6],
    ]);
    out += hull([
      [40, 10],
      [78, 34],
      [66, 6],
    ]);
  }
  return `<g transform="rotate(${TILT})">${out}</g>`;
}

const mk = (name: string, kind: Parameters<typeof weapon>[1], work: Pt): Item => ({
  name,
  work: rot(work, TILT),
  draw: (f) => weapon(f, kind),
});
const pulseBlade = mk("PULSE BLADE", "pulse", [70, 0]);
const arcSaber = mk("ARC SABER", "saber", [90, 0]);
const shardCleaver = mk("SHARD CLEAVER", "cleaver", [40, -28]);
const siegeMaul = mk("SIEGE MAUL", "maul", [62, -46]);
const fangBlade = mk("FANG BLADE", "fang", [70, -12]);
const sporeLance = mk("SPORE LANCE", "spore", [62, -20]);
const thornLance = mk("THORN LANCE", "thorn", [70, -10]);

// --- armour ------------------------------------------------------------------------

const TORSO: Pt[] = [
  [-70, -70],
  [-30, -82],
  [30, -82],
  [70, -70],
  [82, -20],
  [50, 54],
  [-50, 54],
  [-82, -20],
];

function torso(f: number, kind: "armor" | "ward" | "skyweave" | "sovereign"): string {
  let out = "";
  if (kind === "skyweave") {
    out += hull([
      [-70, -66],
      [-104, -10],
      [-98, 46],
      [-76, 44],
      [-62, -10],
    ]);
    out += hull([
      [70, -66],
      [104, -10],
      [98, 46],
      [76, 44],
      [62, -10],
    ]);
  }
  out += `<clipPath id="torsoClip"><polygon points="${TORSO.map(P).join(" ")}"/></clipPath>`;
  out += poly(TORSO, "url(#hull)", BLUE.pale, 1.8);
  if (kind === "skyweave") {
    let weave = "";
    for (let i = -10; i <= 10; i++) {
      weave +=
        line([i * 12 - 90, -90], [i * 12 + 30, 60], BLUE.mid, 0.9, 'opacity=".7"') +
        line([i * 12 + 90, -90], [i * 12 - 30, 60], BLUE.mid, 0.9, 'opacity=".7"');
    }
    out += `<g clip-path="url(#torsoClip)">${weave}</g>`;
    out += path(`M0 -82V54`, BLUE.pale, 1.6);
  } else {
    for (let i = 0; i < 4; i++)
      out += path(
        `M${-66 + i * 4} ${-46 + i * 26}Q0 ${-36 + i * 26 + (f % 2)} ${66 - i * 4} ${-46 + i * 26}`,
        BLUE.mid,
        1.3,
      );
    for (const s of [-1, 1])
      out += path(`M${s * 40} -80Q${s * 70} -20 ${s * 42} 52`, BLUE.light, 1.3);
    out += [-1, 1]
      .map(
        (s) =>
          `<ellipse cx="${s * 74}" cy="-66" rx="20" ry="13" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
      )
      .join("");
  }
  if (kind === "ward") {
    out += `<circle cx="0" cy="-8" r="${(30 + f * 3).toFixed(1)}" fill="url(#flare)"/>`;
    out += poly(
      [
        [0, -34],
        [22, -8],
        [0, 22],
        [-22, -8],
      ],
      "url(#crystal)",
      "#ffffff",
      1.6,
    );
    out += line([-22, -8], [22, -8], BLUE.deep, 1) + line([0, -34], [0, 22], BLUE.deep, 1);
  }
  if (kind === "sovereign") {
    out += `<circle cx="0" cy="-8" r="${(36 + f * 3).toFixed(1)}" fill="url(#flare)" opacity=".7"/>`;
    out += crystal(-32, 18, 44, 8, -12) + crystal(0, 22, 62, 10, 0) + crystal(32, 18, 44, 8, 12);
    for (let i = 0; i < 3; i++)
      out += `<circle cx="0" cy="-8" r="${(44 + ((f + i) % 4) * 14).toFixed(1)}" fill="none" stroke="${BLUE.pale}" stroke-width="1" opacity="${(0.8 - ((f + i) % 4) * 0.2).toFixed(2)}"/>`;
  }
  return out;
}

const armor: Item = { name: "COMPOSITE ARMOR", work: [52, -30], draw: (f) => torso(f, "armor") };
const wardPlate: Item = { name: "WARD PLATE", work: [30, -14], draw: (f) => torso(f, "ward") };
const skyweave: Item = {
  name: "SKYWEAVE SUIT",
  work: [60, -10],
  draw: (f) => torso(f, "skyweave"),
};
const sovereignMail: Item = {
  name: "SOVEREIGN MAIL",
  work: [34, 10],
  draw: (f) => torso(f, "sovereign"),
};

function head(f: number, kind: "scout" | "prism" | "crown"): string {
  if (kind === "crown") {
    let spikes = "";
    for (let i = -3; i <= 3; i++) {
      const h = 56 - Math.abs(i) * 9;
      spikes += hull(
        [
          [i * 22 - 10, -4 - Math.abs(i) * 1],
          [i * 22, -4 - h - (i === 0 ? 8 : 0)],
          [i * 22 + 10, -4 - Math.abs(i) * 1],
        ],
        BLUE.pale,
        1.4,
      );
    }
    return [
      spikes,
      `<ellipse cx="0" cy="10" rx="88" ry="20" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.8"/>`,
      path("M-88 10v26Q0 62 88 36v-26", BLUE.pale, 1.8, "url(#hull)"),
      ...[-60, -30, 0, 30, 60].map((x) => line([x, 30], [x, 54], BLUE.mid, 1.2)),
      `<circle cx="0" cy="32" r="${(7 + (f % 2)).toFixed(1)}" fill="${BLUE.light}" stroke="#ffffff" stroke-width="1.2"/>`,
    ].join("");
  }
  const frame = path("M-96 -6Q0 -56 96 -6L84 30Q0 -8 -84 30Z", BLUE.pale, 1.8, "url(#hull)");
  if (kind === "scout") {
    let bars = "";
    for (let i = 0; i < 4; i++)
      bars += line(
        [-50 + i * 6, 6 - i * 3],
        [-50 + i * 6 + 20 + ((f + i) % 3) * 12, 6 - i * 3],
        BLUE.light,
        1.4,
      );
    return [
      frame,
      path(
        "M-70 12Q0 -22 70 12L62 26Q0 0 -62 26Z",
        BLUE.light,
        1.4,
        BLUE.light,
        'fill-opacity=".35"',
      ),
      bars,
      line([-96, -6], [-120, 20], BLUE.pale, 2.4),
      line([96, -6], [120, 20], BLUE.pale, 2.4),
    ].join("");
  }
  let facets = "";
  const tri: [Pt, Pt, Pt][] = [
    [
      [-70, 14],
      [-24, -14],
      [-20, 24],
    ],
    [
      [-24, -14],
      [24, -14],
      [0, 24],
    ],
    [
      [24, -14],
      [70, 14],
      [20, 24],
    ],
  ];
  tri.forEach(
    (t, i) =>
      (facets += poly(
        t,
        i === 1 ? "url(#crystal)" : BLUE.light,
        "#ffffff",
        1.2,
        i === 1 ? "" : 'fill-opacity=".35"',
      )),
  );
  let rays = "";
  for (let i = 0; i < 5; i++)
    rays += line(
      [0, 24],
      [-60 + i * 30, 60 + ((f + i) % 2) * 6],
      BLUE.pale,
      1.2,
      `opacity="${0.4 + 0.1 * i}"`,
    );
  return [frame, facets, rays].join("");
}

const scoutVisor: Item = { name: "SCOUT VISOR", work: [90, -6], draw: (f) => head(f, "scout") };
const prismVisor: Item = { name: "PRISM VISOR", work: [70, 14], draw: (f) => head(f, "prism") };
const chitinCrown: Item = { name: "CHITIN CROWN", work: [60, -20], draw: (f) => head(f, "crown") };

// --- the scene ---------------------------------------------------------------------

function forge(item: Item, f: number): string {
  const hover = Math.sin(rad(f * 90)) * 2;
  const origin: Pt = [320, 196 + hover];
  const tip: Pt = [origin[0] + item.work[0], origin[1] + item.work[1]];
  const sweep = [0.15, 0.4, 0.65, 0.9][f];
  const sweepY = -96 + 192 * sweep;
  const dimW = 200 + Math.floor(hash(item.name.length, 1, 113) * 200);
  const dimH = 60 + Math.floor(hash(item.name.length, 2, 113) * 120);
  const platform = [
    `<polygon points="190,300 450,300 420,110 220,110" fill="${BLUE.light}" opacity=".06"/>`,
    `<ellipse cx="320" cy="306" rx="150" ry="20" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    `<ellipse cx="320" cy="306" rx="104" ry="13" fill="none" stroke="${BLUE.light}" stroke-width="1.2" stroke-dasharray="14 8" stroke-dashoffset="${f * 10}"/>`,
  ].join("");
  const dims = [
    line([190, 336], [450, 336], BLUE.mid, 1) +
      line([190, 330], [190, 342], BLUE.mid, 1) +
      line([450, 330], [450, 342], BLUE.mid, 1),
    text(310, 334, 8, String(dimW), BLUE.mid),
    line([156, 110], [156, 290], BLUE.mid, 1) +
      line([150, 110], [162, 110], BLUE.mid, 1) +
      line([150, 290], [162, 290], BLUE.mid, 1),
    text(138, 204, 8, String(dimH), BLUE.mid, 'transform="rotate(-90 138 204)"'),
  ].join("");
  const scan = [
    `<rect x="-130" y="${(sweepY - 16).toFixed(1)}" width="260" height="16" fill="${BLUE.light}" opacity=".16"/>`,
    line([-130, sweepY], [130, sweepY], "#ffffff", 1.4, 'opacity=".9"'),
  ].join("");
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]
    .map(([sx, sy]) =>
      path(
        `M${origin[0] + sx * 132} ${origin[1] + sy * 100 - sy * 16}v${sy * 16}h${-sx * 16}`,
        BLUE.pale,
        1.4,
      ),
    )
    .join("");
  const progress = `<rect x="240" y="352" width="160" height="6" fill="none" stroke="${BLUE.mid}" stroke-width=".8"/><rect x="240" y="352" width="${(160 * (0.25 + f * 0.2)).toFixed(1)}" height="6" fill="${BLUE.light}" opacity=".85"/>`;
  return [
    platform,
    `<g transform="translate(${origin[0]} ${origin[1]})">${item.draw(f)}${scan}</g>`,
    corners,
    dims,
    arm(tip, true),
    sparks(tip, f),
    progress,
    callout([origin[0] + 104, origin[1] + 62], [452, 262], item.name),
  ].join("");
}

const ITEMS: Record<string, Item> = {
  craft_alloy: alloy,
  craft_circuit_board: circuit,
  craft_servo: servo,
  craft_power_core: powerCore,
  craft_fusion_cell: fusionCell,
  craft_torch: cuttingTorch,
  craft_harvest_kit: harvestKit,
  craft_drill: plasmaDrill,
  craft_blade: pulseBlade,
  craft_armor: armor,
  craft_skyweave: skyweave,
  craft_scout_visor: scoutVisor,
  craft_arc_saber: arcSaber,
  craft_prism_visor: prismVisor,
  craft_deep_harvester: deepHarvester,
  craft_arc_torch: arcTorch,
  craft_ward_plate: wardPlate,
  craft_quantum_drill: quantumDrill,
  craft_shard_cleaver: shardCleaver,
  craft_spore_lance: sporeLance,
  craft_siege_maul: siegeMaul,
  craft_thorn_lance: thornLance,
  craft_fang_blade: fangBlade,
  craft_chitin_crown: chitinCrown,
  craft_sovereign_mail: sovereignMail,
};

export const FORGE_SCENES: Record<string, (f: number) => string> = Object.fromEntries(
  Object.entries(ITEMS).map(([id, item]) => [id, (f: number) => forge(item, f)]),
);
