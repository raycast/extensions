import { BLUE, circle, line, P, path, poly, Pt } from "./hud";
import { at, card, glow, mirrored, rad, Scene, sparks, wave } from "./hud-kit";
import { crystal } from "./hud-scenes";
import { hash } from "./util";

/** The ground line every outdoor scene stands on, with a few ripples under it. */
const floor = (y = 300) =>
  line([60, y], [580, y], BLUE.pale, 1.8) +
  [0, 1, 2]
    .map((i) =>
      path(
        `M${90 + i * 30} ${y + 14 + i * 12}q60 -4 120 0t120 0t100 0`,
        BLUE.line,
        1,
        "none",
        `opacity="${0.6 - i * 0.15}"`,
      ),
    )
    .join("");

const leafAt = (b: Pt, t: Pt, w = 8) =>
  path(
    `M${P(b)}Q${(b[0] + t[0]) / 2 + w},${(b[1] + t[1]) / 2 - w} ${P(t)}Q${(b[0] + t[0]) / 2 - w},${(b[1] + t[1]) / 2 + w} ${P(b)}Z`,
    BLUE.pale,
    1.2,
    "url(#crystal)",
    'fill-opacity=".6"',
  );

// --- salvaging ---------------------------------------------------------------------

const SALVAGE: Record<string, [string, (f: number) => string]> = {
  salvage_engine: [
    "ENGINE HOUSING",
    (f) => {
      const body = poly(
        [
          [-110, -40],
          [60, -50],
          [110, -70],
          [110, 70],
          [60, 50],
          [-110, 40],
        ],
        "url(#hull)",
        BLUE.pale,
        1.8,
      );
      const out =
        body +
        `<ellipse cx="110" cy="0" rx="18" ry="70" fill="none" stroke="${BLUE.pale}" stroke-width="1.6"/>` +
        path("M-60 -44V44M-20 -48V48M20 -50V50", BLUE.mid, 1.2);
      return (
        out + circle([110, 0], 40, BLUE.light, 1.2, "url(#flare)", 'fill-opacity=".4"') + sparks([110, 0], 50, f, 6, 2)
      );
    },
  ],
  salvage_coils: [
    "DRIVE COIL",
    (f) => {
      let d = "M-90 0";
      for (let i = 0; i < 9; i++) d += `Q${-90 + i * 22 + 11} ${(i % 2 ? 1 : -1) * 50} ${-90 + (i + 1) * 22} 0`;
      return (
        path(d, BLUE.pale, 7, "none", 'opacity=".4"') +
        path(d, BLUE.light, 3) +
        line([-100, 0], [110, 0], BLUE.pale, 4) +
        [0, 1, 2]
          .map((i) =>
            path(
              `M${-60 + i * 60} -52l10 -18 -10 8 14 -14`,
              "#ffffff",
              1.6,
              "none",
              `opacity="${(f + i) % 3 ? 0.3 : 1}"`,
            ),
          )
          .join("")
      );
    },
  ],
  salvage_shields: [
    "SHIELD SLAB",
    (f) => {
      const slab = poly(
        [
          [-100, -60],
          [90, -70],
          [110, 60],
          [-90, 70],
        ],
        "url(#hull)",
        BLUE.pale,
        1.8,
      );
      let out = slab + path("M-70 -40L80 -50M-66 0L90 -4M-60 40L92 34", BLUE.mid, 1.2);
      for (let i = 0; i < 4; i++) out += circle([-76 + i * 56, 0], 5, BLUE.pale, 1.2, BLUE.bg);
      return (
        out +
        path("M-20 -66Q0 -20 -30 20Q-10 40 10 66", BLUE.light, 2.4, "none", 'stroke-dasharray="6 4"') +
        glow([0, 0], 120, 0.12 + 0.08 * (f % 2))
      );
    },
  ],
  salvage_nav: [
    "NAV ARRAY",
    (f) => {
      const dish = path("M-90 -20Q0 -110 90 -20Q0 -50 -90 -20Z", BLUE.pale, 1.8, "url(#hull)");
      let out = dish + line([0, -50], [0, 60], BLUE.pale, 5) + line([-40, 60], [40, 60], BLUE.pale, 6);
      const tip: Pt = [0, -86];
      out += line([0, -50], tip, BLUE.light, 2) + circle(tip, 5, "#ffffff", 1, "#ffffff");
      for (let i = 0; i < 5; i++)
        out += circle(
          [-120 + i * 60, -110 + hash(i, 2) * 30],
          2,
          "#ffffff",
          0.8,
          "#ffffff",
          `opacity="${(i + f) % 2 ? 0.4 : 1}"`,
        );
      return out;
    },
  ],
  salvage_bridge: [
    "BRIDGE CONSOLE",
    (f) => {
      const desk = poly(
        [
          [-120, 40],
          [120, 40],
          [90, -10],
          [-90, -10],
        ],
        "url(#hull)",
        BLUE.pale,
        1.8,
      );
      let out =
        desk +
        poly(
          [
            [-100, -10],
            [-30, -10],
            [-30, -80],
            [-110, -70],
          ],
          "none",
          BLUE.light,
          1.5,
        ) +
        poly(
          [
            [30, -10],
            [100, -10],
            [110, -70],
            [30, -80],
          ],
          "none",
          BLUE.light,
          1.5,
        );
      for (let i = 0; i < 5; i++)
        out += line(
          [-96 + i * 12, -60 + i * 8],
          [-40, -60 + i * 8],
          BLUE.mid,
          2,
          `opacity="${(i + f) % 3 ? 0.4 : 0.95}"`,
        );
      for (let i = 0; i < 8; i++)
        out += circle([-70 + i * 20, 14], 3.4, BLUE.pale, 1, (i + f) % 4 ? BLUE.bg : "#ffffff");
      return (
        out +
        poly(
          [
            [-14, -20],
            [14, -20],
            [10, -60],
            [-10, -60],
          ],
          "url(#plate)",
          BLUE.pale,
          1.4,
        )
      );
    },
  ],
  salvage_blackbox: [
    "BLACK BOX",
    (f) => {
      let out = `<rect x="-70" y="-44" width="140" height="88" rx="8" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.8"/>`;
      for (let i = 1; i <= 2; i++)
        out += `<rect x="${-70 - i * 12}" y="${-44 - i * 12}" width="${140 + i * 24}" height="${88 + i * 24}" rx="${8 + i * 4}" fill="none" stroke="${BLUE.light}" stroke-width="1.2" stroke-dasharray="${8 + i * 4} 6" opacity="${0.8 - i * 0.2}"/>`;
      return (
        out +
        circle([0, 0], 14, "#ffffff", 1.6, f % 2 ? "#ffffff" : BLUE.bg) +
        path("M-50 30H50", BLUE.mid, 1.4, "none", 'stroke-dasharray="4 3"') +
        path("M-56 -26h26", "#ffffff", 3)
      );
    },
  ],
  salvage_core: [
    "REACTOR CORE",
    (f) => {
      let out = circle([0, 0], 50, BLUE.pale, 1.8, "url(#hull)");
      for (let i = 0; i < 8; i++) {
        const a = rad(i * 45);
        out += line([Math.cos(a) * 50, Math.sin(a) * 50], [Math.cos(a) * 92, Math.sin(a) * 92], BLUE.light, 3);
        out += circle([Math.cos(a) * 92, Math.sin(a) * 92], 6, BLUE.pale, 1.2, BLUE.bg);
      }
      return out + circle([0, 0], 24 - (f % 2) * 3, "#ffffff", 1.6, "url(#flare)") + glow([0, 0], 100, 0.3);
    },
  ],
};

// --- mining ------------------------------------------------------------------------

const rockMass = (w: number, h: number, seed: number, fill = "url(#rock)") => {
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++)
    pts.push([-w + (2 * w * i) / 10, -h * Math.sin((Math.PI * i) / 10) * (0.7 + hash(i, seed) * 0.5)]);
  return poly([...pts, [w, 0], [-w, 0]], fill, BLUE.pale, 1.7);
};

const MINE: Record<string, [string, (f: number) => string]> = {
  mine_cobalt: [
    "COBALT SEAM",
    (f) =>
      rockMass(150, 110, 1) +
      [0, 1, 2, 3]
        .map((i) =>
          path(
            `M${-90 + i * 50} -10L${-70 + i * 50} -70L${-40 + i * 50} -30`,
            BLUE.pale,
            2.4,
            "none",
            `opacity="${(f + i) % 4 ? 0.7 : 1}"`,
          ),
        )
        .join("") +
      crystal(40, 0, 60, 14, 6) +
      crystal(70, 0, 40, 10, -8),
  ],
  mine_argent: [
    "ARGENT VEIN",
    (f) =>
      rockMass(150, 120, 2) +
      [0, 1, 2]
        .map((i) =>
          path(
            `M${-110 + i * 30} -4Q${-60 + i * 40} ${-50 - i * 16} ${20 + i * 40} ${-80 + i * 6}`,
            "#ffffff",
            2.2 - i * 0.4,
            "none",
            `opacity="${(f + i) % 3 ? 0.65 : 1}"`,
          ),
        )
        .join("") +
      sparks([20, -60], 40, f, 5, 3),
  ],
  mine_magma: [
    "MAGMA GEODE",
    (f) => {
      const half = (k: number) =>
        path(`M${k * 4} 40Q${k * 70} 30 ${k * 64} -30Q${k * 50} -70 ${k * 4} -64Z`, BLUE.pale, 1.8, "url(#rock)");
      return (
        half(-1) +
        half(1) +
        circle([0, -10], 30, "#ffffff", 1.6, "url(#flare)") +
        glow([0, -10], 80 + (f % 2) * 8, 0.45) +
        [0, 1, 2, 3, 4]
          .map((i) => path(`M${-24 + i * 12} -10l${(i % 2 ? 1 : -1) * 4} -${16 + hash(i, f) * 14}`, "#ffffff", 1.6))
          .join("")
      );
    },
  ],
  mine_void: [
    "VOIDSTONE",
    (f) =>
      rockMass(100, 90, 5, "#02081a") +
      [0, 1, 2, 3, 4, 5]
        .map((i) =>
          line(
            [Math.cos(rad(i * 60 + f * 8)) * 150, Math.sin(rad(i * 60 + f * 8)) * 80 - 40],
            [Math.cos(rad(i * 60 + f * 8)) * 70, Math.sin(rad(i * 60 + f * 8)) * 36 - 40],
            BLUE.pale,
            1,
            'opacity=".6"',
          ),
        )
        .join("") +
      circle([0, -40], 6, BLUE.pale, 1.2, "none"),
  ],
  mine_song: [
    "SONG CRYSTAL",
    (f) =>
      crystal(0, 40, 150, 30, 0) +
      crystal(-50, 40, 90, 18, -12) +
      crystal(48, 40, 100, 20, 10) +
      [0, 1, 2]
        .map((i) =>
          path(
            `M${70 + i * 24} ${-40 + i * 8}Q${86 + i * 24} -10 ${70 + i * 24} ${20 - i * 8}M${-70 - i * 24} ${-40 + i * 8}Q${-86 - i * 24} -10 ${-70 - i * 24} ${20 - i * 8}`,
            BLUE.light,
            1.4,
            "none",
            `opacity="${(f + i) % 3 ? 0.35 : 1}"`,
          ),
        )
        .join(""),
  ],
  mine_dark: [
    "DARK MATTER",
    (f) => {
      let out = "";
      for (let i = 0; i < 6; i++) {
        const a = rad(i * 60 + f * 14);
        const c: Pt = [Math.cos(a) * 70, Math.sin(a) * 44];
        out += poly(
          [
            [c[0], c[1] - 16],
            [c[0] + 10, c[1]],
            [c[0], c[1] + 16],
            [c[0] - 10, c[1]],
          ],
          "#02081a",
          BLUE.pale,
          1.4,
        );
      }
      return (
        out +
        circle([0, 0], 20, BLUE.pale, 1.6, "#02081a") +
        circle([0, 0], 34 + (f % 2) * 3, BLUE.light, 1, "none", 'stroke-dasharray="3 5"')
      );
    },
  ],
  mine_starfall: [
    "STARFALL IRON",
    (f) => {
      const crater =
        path("M-130 0Q-60 28 0 20Q60 28 130 0", BLUE.pale, 1.8, "none") + path("M-100 4Q0 40 100 4", BLUE.mid, 1);
      return (
        crater +
        line([-150, -150], [-14, -30], BLUE.light, 3, 'opacity=".5"') +
        line([-120, -150], [-8, -34], "#ffffff", 1.4) +
        rockMass(40, 40, 8, "url(#plate)") +
        sparks([0, -24], 50 + (f % 2) * 6, f, 8, 2)
      );
    },
  ],
  mine_heart: [
    "MOUNTAIN HEART",
    (f) => {
      const beat = 1 + (f % 2) * 0.06;
      return (
        rockMass(150, 130, 9) +
        `<g transform="translate(0 -44) scale(${beat})">${poly(
          mirrored([
            [0, -40],
            [30, -30],
            [40, 10],
            [20, 40],
          ]).map(([x, y]): Pt => [x, y]),
          "url(#crystal)",
          "#ffffff",
          1.8,
        )}</g>` +
        glow([0, -44], 110, 0.35 + 0.1 * (f % 2)) +
        [0, 1, 2, 3]
          .map((i) => path(`M${-30 + i * 20} -44L${-60 + i * 40} ${-110 + (i % 2) * 20}`, BLUE.pale, 1.2))
          .join("")
      );
    },
  ],
};

// --- foraging ----------------------------------------------------------------------

const bush = (n: number, f: number, tip: (c: Pt, i: number) => string) =>
  Array.from({ length: n }, (_, i) => {
    const x = -70 + (140 * i) / (n - 1);
    const top: Pt = [x + wave(f, i) * 4, -60 - hash(i, 6) * 50];
    return line([x, 40], top, BLUE.pale, 2.4) + tip(top, i);
  }).join("");

const FORAGE: Record<string, [string, (f: number) => string]> = {
  forage_berry: [
    "PALE BERRIES",
    (f) =>
      bush(
        4,
        f,
        (c) =>
          leafAt(c, [c[0] + 30, c[1] - 14], 6) +
          [0, 1, 2]
            .map((k) =>
              circle([c[0] - 10 + k * 10, c[1] + 16 + k * 6], 6, BLUE.pale, 1.3, "url(#crystal)", 'fill-opacity=".8"'),
            )
            .join(""),
      ),
  ],
  forage_thorn: [
    "THORNVINE",
    (f) => {
      let d = "M-110 40";
      for (let i = 1; i <= 8; i++) d += `L${-110 + i * 28} ${Math.sin(rad(i * 70 + f * 20)) * 40 - 10}`;
      let out = path(d, BLUE.pale, 3);
      for (let i = 1; i <= 8; i++)
        out += poly(
          [
            [-110 + i * 28 - 4, Math.sin(rad(i * 70 + f * 20)) * 40 - 10],
            [-110 + i * 28 + 4, Math.sin(rad(i * 70 + f * 20)) * 40 - 10],
            [-110 + i * 28, Math.sin(rad(i * 70 + f * 20)) * 40 - 32 + (i % 2) * 40],
          ],
          "#ffffff",
          "#ffffff",
          0.5,
        );
      return out;
    },
  ],
  forage_mist: [
    "MISTBLOOM",
    (f) => {
      let out = "";
      for (let i = 0; i < 7; i++)
        out += path(
          `M${-120 + i * 40} ${30 + (i % 2) * 14}q30 ${-10 + wave(f, i) * 4} 60 0`,
          BLUE.light,
          8,
          "none",
          'opacity=".18"',
        );
      for (let i = 0; i < 6; i++)
        out += leafAt([0, 20], [Math.cos(rad(i * 60 + 20)) * 56, 20 - Math.abs(Math.sin(rad(i * 60 + 20))) * 80], 10);
      return out + line([0, 20], [0, 80], BLUE.pale, 2.4) + circle([0, 0], 8, "#ffffff", 1.2, "#ffffff");
    },
  ],
  forage_ember: [
    "EMBER PODS",
    (f) =>
      bush(
        3,
        f,
        (c, i) =>
          path(`M${c[0]} ${c[1]}q-24 14 0 40q24 -26 0 -40Z`, "#ffffff", 1.5, "url(#flare)") +
          glow([c[0], c[1] + 20], 28, 0.35 + 0.2 * ((f + i) % 2)),
      ),
  ],
  forage_moss: [
    "WHISPER MOSS",
    (f) => {
      let out = path("M-120 40Q-70 -50 0 -40Q80 -50 120 40Z", BLUE.pale, 1.8, "url(#hull)");
      for (let i = 0; i < 18; i++)
        out += line(
          [-90 + hash(i, 1) * 180, 30 - hash(i, 2) * 40],
          [-90 + hash(i, 1) * 180 + wave(f, i) * 3, 14 - hash(i, 2) * 50],
          BLUE.light,
          1.2,
        );
      return out + path("M-30 -44Q-10 -70 20 -52", BLUE.light, 1.2, "none", 'stroke-dasharray="3 4"');
    },
  ],
  forage_orchid: [
    "GHOST ORCHID",
    (f) => {
      let out = line([0, 80], [0, -20], BLUE.pale, 2.4);
      for (let i = 0; i < 5; i++)
        out += leafAt([0, -20], [Math.cos(rad(i * 72 - 90)) * 60, -20 + Math.sin(rad(i * 72 - 90)) * 60], 12).replace(
          'fill-opacity=".6"',
          `fill-opacity="${(0.15 + 0.12 * ((f + i) % 3)).toFixed(2)}"`,
        );
      return out + circle([0, -20], 8, BLUE.pale, 1.2, "#ffffff");
    },
  ],
  forage_sunfruit: [
    "SUNFRUIT",
    (f) =>
      line([0, 80], [0, -20], BLUE.pale, 7) +
      [-1, 0, 1].map((k) => path(`M0 -10L${k * 70} -60`, BLUE.pale, 3)).join("") +
      [
        [-70, -66],
        [0, -50],
        [70, -66],
        [-36, -90],
        [36, -90],
      ]
        .map(
          ([x, y], i) =>
            circle([x, y], 18, "#ffffff", 1.4, "url(#flare)") + glow([x, y], 36, 0.3 + 0.15 * ((f + i) % 2)),
        )
        .join(""),
  ],
  forage_lily: [
    "SKY LILIES",
    (f) =>
      [0, 1, 2]
        .map((k) => {
          const c: Pt = [-80 + k * 80, -20 + wave(f, k) * 12 - k * 10];
          return (
            line(c, [c[0], c[1] + 90], BLUE.light, 1.2, 'stroke-dasharray="3 3"') +
            [0, 1, 2, 3, 4]
              .map((i) =>
                leafAt(c, [c[0] + Math.cos(rad(i * 72 - 90)) * 34, c[1] + Math.sin(rad(i * 72 - 90)) * 30], 8),
              )
              .join("")
          );
        })
        .join(""),
  ],
  forage_elder: [
    "THE ELDER BLOOM",
    (f) => {
      let out = glow([0, -30], 140, 0.3);
      for (let ring = 0; ring < 3; ring++)
        for (let i = 0; i < 8; i++)
          out += leafAt(
            [0, -30],
            [
              Math.cos(rad(i * 45 + ring * 22 + f * 3)) * (100 - ring * 26),
              -30 + Math.sin(rad(i * 45 + ring * 22 + f * 3)) * (70 - ring * 18),
            ],
            14 - ring * 3,
          );
      return out + line([0, -30], [0, 80], BLUE.pale, 3) + circle([0, -30], 14, "#ffffff", 1.6, "url(#flare)");
    },
  ],
};

export const WORLD_SCENES: Record<string, Scene> = {
  ...Object.fromEntries(
    Object.entries(SALVAGE).map(([id, [label, draw]]) => [
      id,
      (f: number) => floor() + at(320, 200, 1, 0, draw(f)) + card("", label, [320, 200], f, 84, [430, 330]),
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(MINE).map(([id, [label, draw]]) => [
      id,
      (f: number) => floor() + at(320, 290, 1.1, 0, draw(f)) + card("", label, [320, 220], f, 80, [430, 330]),
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(FORAGE).map(([id, [label, draw]]) => [
      id,
      (f: number) => floor() + at(320, 230, 1.1, 0, draw(f)) + card("", label, [320, 210], f, 80, [430, 330]),
    ]),
  ),
};
