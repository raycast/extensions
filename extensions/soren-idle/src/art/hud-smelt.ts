import { BLUE, circle, line, path, poly } from "./hud";
import { BENCH, bench, flame, steam } from "./hud-lab";
import { at, card, glow, rad, Scene, sparks, wave } from "./hud-kit";

/** A bar seen from the front corner. */
function ingot(x: number, y: number, w: number, fill = "url(#plate)"): string {
  const h = w * 0.34;
  return (
    poly(
      [
        [x + 8, y - h],
        [x + w, y - h],
        [x + w - 8, y],
        [x, y],
      ],
      fill,
      BLUE.pale,
      1.3,
    ) +
    poly(
      [
        [x, y],
        [x + w - 8, y],
        [x + w - 8, y + h * 0.6],
        [x, y + h * 0.6],
      ],
      "url(#hull)",
      BLUE.light,
      1.2,
    )
  );
}

function crucible(cx: number, top: number, f: number, tilt = 0): string {
  const body = poly(
    [
      [-60, 0],
      [60, 0],
      [42, 66],
      [-42, 66],
    ],
    "url(#hull)",
    BLUE.light,
    1.6,
  );
  const lip = `<ellipse cx="0" cy="0" rx="60" ry="10" fill="url(#plate)" fill-opacity=".9" stroke="${BLUE.pale}" stroke-width="1.5"/>`;
  return at(cx, top, 1, tilt, body + lip + steam(0, -14, f, 2));
}

const moulds = (x: number, n: number, fill?: string) =>
  Array.from({ length: n }, (_, i) => ingot(x + i * 54, BENCH - 6, 50, fill)).join("");

const anvil = (cx: number, y: number) =>
  poly(
    [
      [cx - 70, y],
      [cx + 70, y],
      [cx + 90, y + 14],
      [cx + 40, y + 20],
      [cx + 30, y + 52],
      [cx + 56, y + 60],
      [cx - 56, y + 60],
      [cx - 30, y + 52],
      [cx - 40, y + 20],
      [cx - 90, y + 14],
    ],
    "url(#hull)",
    BLUE.pale,
    1.6,
  );

const pour = (x0: number, y0: number, x1: number, y1: number, f: number) =>
  path(
    `M${x0} ${y0}Q${x0 + 30} ${y0 + 10} ${x1} ${y1}`,
    "#ffffff",
    2.6,
    "none",
    `opacity="${(0.55 + 0.45 * (f % 2)).toFixed(2)}"`,
  );

const SMELT: Record<string, [string, Scene]> = {
  smelt_ferrite: [
    "FERRITE INGOT",
    (f) =>
      flame(240, 262, f) +
      crucible(240, 190, f, 14) +
      pour(296, 198, 372, BENCH - 30, f) +
      moulds(360, 3) +
      at(0, 0, 1, 0, ""),
  ],
  smelt_steel: [
    "CARBON STEEL",
    (f) => {
      const tank =
        poly(
          [
            [360, 200],
            [520, 200],
            [510, 300],
            [370, 300],
          ],
          "url(#hull)",
          BLUE.light,
          1.5,
        ) +
        path("M368 224H512", BLUE.pale, 2) +
        steam(440, 196, f, 3);
      return (
        flame(200, 262, f) +
        at(210, 220, 1, 0, ingot(-30, 0, 70)) +
        line([250, 214], [400, 196], BLUE.pale, 3) +
        tank +
        ingot(410 + wave(f) * 4, 240 + (f % 2) * 6, 60, "url(#plate)") +
        sparks([400, 220], 30, f, 6, 3)
      );
    },
  ],
  smelt_glass: [
    "LUMINA GLASS",
    (f) => {
      const pipe =
        line([100, 180], [330, 200], BLUE.pale, 4) +
        circle([350 + wave(f) * 3, 205], 24 + (f % 2) * 4, BLUE.pale, 1.8, "url(#crystal)", 'fill-opacity=".6"') +
        glow([350, 205], 70, 0.4);
      const sheets = [0, 1, 2]
        .map((i) =>
          poly(
            [
              [420 + i * 30, 250],
              [470 + i * 30, 236],
              [470 + i * 30, 300],
              [420 + i * 30, 312],
            ],
            "url(#crystal)",
            BLUE.pale,
            1.3,
            'fill-opacity=".55"',
          ),
        )
        .join("");
      return flame(350, 262, f) + pipe + sheets;
    },
  ],
  smelt_chitin: [
    "CHITIN ALLOY",
    (f) => {
      const plates = [0, 1, 2, 3]
        .map((i) =>
          path(
            `M${200 + i * 46} 300Q${210 + i * 46} ${250 - i * 12} ${240 + i * 46} 300`,
            BLUE.pale,
            1.6,
            "url(#hull)",
          ),
        )
        .join("");
      const press =
        poly(
          [
            [180, 190 + (f % 2) * 8],
            [420, 190 + (f % 2) * 8],
            [410, 214 + (f % 2) * 8],
            [190, 214 + (f % 2) * 8],
          ],
          "url(#plate)",
          BLUE.pale,
          1.6,
        ) + line([300, 120], [300, 190 + (f % 2) * 8], BLUE.pale, 6);
      return plates + press + ingot(450, BENCH - 6, 70) + sparks([300, 230], 50, f, 6, 6);
    },
  ],
  smelt_xeno: [
    "XENO ALLOY",
    (f) => {
      const orb = circle([320, 210], 34 + wave(f) * 3, "#ffffff", 1.8, "url(#flare)") + glow([320, 210], 90, 0.5);
      let rings = "";
      for (let i = 0; i < 3; i++)
        rings += `<ellipse cx="320" cy="210" rx="${70 + i * 14}" ry="${22 + i * 8}" fill="none" stroke="${BLUE.pale}" stroke-width="1.3" transform="rotate(${i * 60 + f * 22} 320 210)"/>`;
      return (
        rings +
        orb +
        poly(
          [
            [270, 312],
            [370, 312],
            [350, 290],
            [290, 290],
          ],
          "url(#hull)",
          BLUE.pale,
          1.5,
        )
      );
    },
  ],
  smelt_cobalt: [
    "COBALT BAR",
    (f) =>
      flame(200, 262, f) +
      crucible(200, 190, f) +
      poly(
        [
          [330, 280],
          [520, 280],
          [500, BENCH],
          [350, BENCH],
        ],
        "url(#hull)",
        BLUE.pale,
        1.5,
      ) +
      ingot(360, 270, 120, "url(#crystal)") +
      glow([420, 262], 90, 0.3),
  ],
  smelt_argent: [
    "ARGENT BAR",
    (f) => {
      const sheet =
        poly(
          [
            [160, 270],
            [420, 250],
            [440, 296],
            [180, 316],
          ],
          "url(#plate)",
          "#ffffff",
          1.6,
          'fill-opacity=".85"',
        ) + line([180, 284], [410, 268], BLUE.deep, 1);
      const roller = (x: number, y: number) =>
        `<ellipse cx="${x}" cy="${y}" rx="14" ry="${34}" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.5" transform="rotate(${(f % 2) * 6} ${x} ${y})"/>`;
      return (
        sheet +
        roller(150, 250) +
        roller(150, 296) +
        ingot(470, BENCH - 8, 60, "url(#plate)") +
        glow([300, 250], 140, 0.18)
      );
    },
  ],
  smelt_voidsteel: [
    "VOIDSTEEL",
    (f) => {
      let rays = "";
      for (let i = 0; i < 10; i++) {
        const a = rad(i * 36 + f * 9);
        rays += line(
          [320 + Math.cos(a) * 160, 210 + Math.sin(a) * 100],
          [320 + Math.cos(a) * 60, 210 + Math.sin(a) * 38],
          BLUE.pale,
          1,
          'opacity=".7"',
        );
      }
      return (
        rays +
        ingot(260, 232, 120, "#05122c") +
        circle([320, 216], 20, BLUE.pale, 1.4, "none", 'stroke-dasharray="5 4"')
      );
    },
  ],
  smelt_songglass: [
    "SONGGLASS",
    (f) => {
      const bell =
        path("M280 290Q276 200 320 150Q364 200 360 290Z", BLUE.pale, 1.8, "url(#crystal)", 'fill-opacity=".6"') +
        line([320, 150], [320, 120], BLUE.pale, 3);
      let waves = "";
      for (let i = 0; i < 3; i++)
        waves += path(
          `M${250 - i * 22} ${180 + i * 10}Q${230 - i * 22} 220 ${250 - i * 22} ${260 - i * 10}M${390 + i * 22} ${180 + i * 10}Q${410 + i * 22} 220 ${390 + i * 22} ${260 - i * 10}`,
          BLUE.light,
          1.3,
          "none",
          `opacity="${((f + i) % 3 ? 0.35 : 0.9).toFixed(2)}"`,
        );
      return bell + waves + line([280, 290], [360, 290], BLUE.pale, 2);
    },
  ],
  smelt_dark: [
    "DARK ALLOY",
    (f) => {
      const hammer = at(
        250,
        130 + (f % 2) * 40,
        1,
        -20 + wave(f) * 6,
        poly(
          [
            [-10, 0],
            [60, 0],
            [60, 36],
            [-10, 36],
          ],
          "url(#plate)",
          BLUE.pale,
          1.6,
        ) + line([20, 36], [20, 130], BLUE.pale, 5),
      );
      return (
        anvil(320, 240) +
        ingot(280, 236, 90, "#05122c") +
        hammer +
        sparks([330, 226], 56, f, 8, 5) +
        circle([420, 190], 30, BLUE.pale, 1.4, "#05122c") +
        glow([420, 190], 70, 0.2)
      );
    },
  ],
  smelt_starfall: [
    "STARFALL INGOT",
    (f) => {
      const trail = [0, 1, 2]
        .map((i) =>
          line(
            [120 + i * 20, 60 + i * 14],
            [280 + i * 6, 200 + i * 6],
            BLUE.light,
            2 - i * 0.5,
            `opacity="${0.8 - i * 0.2}"`,
          ),
        )
        .join("");
      return (
        trail +
        anvil(330, 250) +
        ingot(290, 244, 90, "url(#plate)") +
        glow([330, 220], 80, 0.5) +
        sparks([330, 228], 60, f, 8, 7)
      );
    },
  ],
};

export const SMELT_SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(SMELT).map(([id, [label, draw]]) => [
    id,
    (f: number) => bench() + draw(f) + card("", label, [320, 224], f, 74, [430, 322]),
  ]),
);
