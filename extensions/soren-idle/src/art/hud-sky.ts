import { BLUE, circle, line, P, path, poly, Pt } from "./hud";
import { card, glow, rad, Scene, sparks, wave } from "./hud-kit";
import { hash } from "./util";

function sky(seed: number, f: number): string {
  let out = "";
  for (let i = 0; i < 46; i++) {
    const x = 60 + hash(i, 1, seed) * 520;
    const y = 50 + hash(i, 2, seed) * 280;
    out += circle(
      [x, y],
      0.8 + hash(i, 3, seed) * 1.4,
      BLUE.pale,
      0,
      BLUE.pale,
      `opacity="${(i + f) % 3 ? 0.5 : 0.95}"`,
    );
  }
  return out;
}

/** The glass jar that catches whatever falls. `fill` is the share of it that is full. */
const jar = (x: number, fill: number, f: number) =>
  poly(
    [
      [x - 58, 270],
      [x + 58, 270],
      [x + 46, 340],
      [x - 46, 340],
    ],
    "url(#hull)",
    BLUE.pale,
    1.6,
  ) +
  path(`M${x - 56} 270h112`, BLUE.pale, 3) +
  `<rect x="${x - 46}" y="${340 - 70 * fill - (f % 2) * 3}" width="92" height="${70 * fill + (f % 2) * 3}" fill="${BLUE.light}" opacity=".5"/>`;

/** Specks that fall into the jar, drifting with `drift`. */
function fall(x: number, n: number, f: number, seed: number, r = 2, drift = 0): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const phase = ((f + hash(i, 4, seed) * 4) % 4) / 4;
    out += circle(
      [x - 70 + hash(i, 5, seed) * 140 + phase * drift, 80 + phase * 190],
      r,
      "#ffffff",
      0.8,
      "#ffffff",
      `opacity="${(1 - phase * 0.4).toFixed(2)}"`,
    );
  }
  return out;
}

const star = (c: Pt, r: number) =>
  path(
    `M${c[0]} ${c[1] - r}Q${c[0]} ${c[1]} ${c[0] + r} ${c[1]}Q${c[0]} ${c[1]} ${c[0]} ${c[1] + r}Q${c[0]} ${c[1]} ${c[0] - r} ${c[1]}Q${c[0]} ${c[1]} ${c[0]} ${c[1] - r}Z`,
    BLUE.pale,
    1,
    BLUE.pale,
  );

/** A constellation: the stars light and join up as the frames run. */
function chart(pts: Pt[], f: number, seed: number): string {
  const shown = Math.min(pts.length, 2 + f + (pts.length > 5 ? 2 : 0));
  return (
    sky(seed, f) +
    path(`M${pts.slice(0, shown).map(P).join("L")}`, BLUE.pale, 1.6) +
    pts.map((p, i) => (i < shown ? star(p, 9) + glow(p, 24, 0.35) : circle(p, 3, BLUE.pale, 1.2, BLUE.bg))).join("")
  );
}

const SKY: Record<string, [string, Scene, Pt]> = {
  watch_stars: ["STAR DUST", (f) => sky(7, f) + fall(320, 10, f, 1) + jar(320, 0.3, f), [320, 300]],
  watch_comets: [
    "COMET ICE",
    (f) => {
      const head: Pt = [180 + f * 14, 120 + f * 8];
      return (
        sky(8, f) +
        path(`M${head[0]} ${head[1]}L${head[0] + 200} ${head[1] - 60}`, BLUE.light, 8, "none", 'opacity=".25"') +
        circle(head, 12, "#ffffff", 1.6, "url(#flare)") +
        glow(head, 40, 0.5) +
        fall(330, 8, f, 3, 3, -20) +
        jar(330, 0.5, f)
      );
    },
    [330, 300],
  ],
  watch_nebula: [
    "NEBULA GAS",
    (f) => {
      let cloud = "";
      for (let i = 0; i < 7; i++)
        cloud += circle(
          [200 + hash(i, 1, 9) * 240 + wave(f, i) * 6, 100 + hash(i, 2, 9) * 100],
          40 + hash(i, 3, 9) * 30,
          BLUE.pale,
          0,
          "url(#flare)",
          'opacity=".25"',
        );
      return (
        sky(9, f) + cloud + path("M320 190Q330 230 320 266", BLUE.light, 8, "none", 'opacity=".4"') + jar(320, 0.6, f)
      );
    },
    [320, 300],
  ],
  watch_pulsar: [
    "PULSAR DUST",
    (f) => {
      const c: Pt = [320, 110];
      return (
        sky(10, f) +
        circle(c, 8, "#ffffff", 1.4, "#ffffff") +
        path(`M${c[0]} ${c[1] - 90}V${c[1] + 90}`, BLUE.pale, 2, "none", `opacity="${f % 2 ? 1 : 0.3}"`) +
        circle(c, 28 + (f % 2) * 14, BLUE.light, 1.2) +
        fall(320, 12, f, 5, 2) +
        jar(320, 0.8, f)
      );
    },
    [320, 300],
  ],
  watch_meteors: [
    "METEOR GLASS",
    (f) => {
      let trails = "";
      for (let i = 0; i < 4; i++)
        trails += line(
          [120 + i * 90 + f * 12, 60 + i * 20 + f * 6],
          [210 + i * 90 + f * 12, 130 + i * 20 + f * 6],
          i % 2 ? BLUE.light : "#ffffff",
          2.4,
        );
      const dish = path("M240 320Q320 360 400 320Z", BLUE.pale, 1.6, "url(#hull)");
      return sky(11, f) + trails + dish + sparks([320, 318], 36, f, 6, 4);
    },
    [320, 320],
  ],
  watch_aurora: [
    "AURORA VAPOR",
    (f) => {
      let curtain = "";
      for (let i = 0; i < 6; i++)
        curtain +=
          path(
            `M${120 + i * 70} 60Q${130 + i * 70 + wave(f, i) * 24} 150 ${120 + i * 70} 240`,
            BLUE.light,
            12,
            "none",
            `opacity="${0.18 + 0.05 * wave(f, i + 1)}"`,
          ) + path(`M${120 + i * 70} 60Q${130 + i * 70 + wave(f, i) * 24} 150 ${120 + i * 70} 240`, BLUE.pale, 1.2);
      return sky(12, f) + curtain + jar(320, 0.5, f);
    },
    [320, 300],
  ],
  watch_quasar: [
    "QUASAR DUST",
    (f) => {
      const c: Pt = [320, 110];
      return (
        sky(13, f) +
        glow(c, 120, 0.4) +
        line([c[0], c[1] - 110], [c[0], c[1] + 110], "#ffffff", 2.4) +
        line([c[0] - 90, c[1]], [c[0] + 90, c[1]], BLUE.light, 1.4) +
        circle(c, 16, "#ffffff", 1.6, "url(#flare)") +
        fall(320, 12, f, 6, 2.4) +
        jar(320, 0.9, f)
      );
    },
    [320, 300],
  ],
  watch_void: [
    "VOID LIGHT",
    (f) => {
      const c: Pt = [320, 150];
      let rays = "";
      for (let i = 0; i < 12; i++) {
        const a = rad(i * 30 + f * 5);
        rays += line(
          [c[0] + Math.cos(a) * 130, c[1] + Math.sin(a) * 80],
          [c[0] + Math.cos(a) * 50, c[1] + Math.sin(a) * 30],
          BLUE.pale,
          1,
          'opacity=".6"',
        );
      }
      return (
        sky(14, f) +
        rays +
        circle(c, 34, BLUE.pale, 1.8, "#02081a") +
        circle(c, 44 + (f % 2) * 3, BLUE.light, 1, "none", 'stroke-dasharray="4 5"') +
        jar(320, 1, f)
      );
    },
    [320, 300],
  ],
  chart_hunter: [
    "THE HUNTER",
    (f) =>
      chart(
        [
          [190, 120],
          [250, 168],
          [310, 210],
          [372, 252],
          [420, 300],
          [300, 120],
          [380, 150],
        ],
        f,
        31,
      ),
    [310, 210],
  ],
  chart_loom: [
    "THE LOOM",
    (f) =>
      chart(
        [
          [170, 300],
          [230, 220],
          [300, 250],
          [370, 160],
          [450, 200],
          [500, 120],
        ],
        f,
        32,
      ),
    [370, 160],
  ],
  chart_crown: [
    "THE CROWN",
    (f) =>
      chart(
        [
          [240, 150],
          [290, 120],
          [350, 124],
          [396, 160],
          [380, 214],
          [320, 236],
          [262, 210],
        ],
        f,
        33,
      ),
    [320, 180],
  ],
  chart_ferryman: [
    "THE FERRYMAN",
    (f) =>
      chart(
        [
          [150, 110],
          [230, 170],
          [330, 150],
          [420, 220],
          [500, 180],
          [540, 280],
        ],
        f,
        34,
      ),
    [420, 220],
  ],
};

export const SKY_SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(SKY).map(([id, [label, draw, focus]]) => [
    id,
    (f: number) => card(draw(f), label, focus, f, 56, [430, 120]),
  ]),
);
