import { BLUE, circle, line, P, path, poly, Pt, text } from "./hud";
import { card, glow, rad, Scene, wave } from "./hud-kit";
import { hash } from "./util";

const C: Pt = [320, 204];

/** A route of waypoints that grows one stop per frame. */
function route(stops: Pt[], f: number): string {
  const shown = 2 + (f % (stops.length - 1));
  return (
    path(`M${stops.slice(0, shown).map(P).join("L")}`, BLUE.pale, 2, "none", 'stroke-dasharray="7 5"') +
    stops
      .slice(0, shown)
      .map((p, i) => circle(p, i === shown - 1 ? 6 : 3.5, BLUE.pale, 1.4, i === shown - 1 ? "#ffffff" : BLUE.bg))
      .join("")
  );
}

const ridgeLine = (y: number, seed: number, amp: number, x0 = 60, x1 = 580) => {
  let d = `M${x0} ${y}`;
  for (let x = x0 + 26; x <= x1; x += 26) d += `L${x} ${y - hash(x, seed) * amp}`;
  return d;
};

const EXPLORE: Record<string, [string, Scene, Pt]> = {
  explore_ridge: [
    "THE RIDGE",
    (f) => {
      let out = "";
      for (let i = 0; i < 4; i++)
        out += path(
          ridgeLine(230 + i * 22, 3 + i, 80 - i * 14),
          BLUE.light,
          1.4 - i * 0.2,
          "none",
          `opacity="${0.95 - i * 0.18}"`,
        );
      return (
        out +
        line([420, 150], [420, 110], BLUE.pale, 2) +
        poly(
          [
            [420, 110],
            [450, 120],
            [420, 130],
          ],
          "#ffffff",
          "#ffffff",
          1,
        ) +
        route(
          [
            [130, 290],
            [220, 260],
            [300, 230],
            [380, 190],
            [420, 150],
          ],
          f,
        )
      );
    },
    [420, 150],
  ],
  explore_canyon: [
    "THE CANYON",
    (f) => {
      const left = poly(
        [
          [60, 120],
          [220, 120],
          [250, 200],
          [210, 300],
          [60, 300],
        ],
        "url(#rock)",
        BLUE.pale,
        1.5,
      );
      const right = poly(
        [
          [580, 120],
          [420, 120],
          [390, 190],
          [430, 300],
          [580, 300],
        ],
        "url(#rock)",
        BLUE.pale,
        1.5,
      );
      let bridge = line([220, 124], [420, 124], BLUE.pale, 2.4);
      for (let i = 0; i < 9; i++)
        bridge += line([228 + i * 22, 124], [228 + i * 22, 134 + wave(f, i) * 2], BLUE.light, 1.2);
      return (
        left +
        right +
        bridge +
        path("M250 200Q320 260 390 190", BLUE.dim, 1, "none", 'stroke-dasharray="4 4"') +
        route(
          [
            [150, 110],
            [230, 110],
            [320, 110],
            [410, 110],
            [480, 110],
          ],
          f,
        )
      );
    },
    [320, 124],
  ],
  explore_caves: [
    "THE CAVES",
    (f) => {
      let out = path("M80 320Q80 140 320 120Q560 140 560 320Z", BLUE.pale, 1.6, "url(#rock)");
      out += path("M120 320Q120 190 320 180Q520 190 520 320", BLUE.light, 1.2);
      out += path("M180 320Q180 240 320 236Q460 240 460 320Z", BLUE.bg, 1.4, BLUE.bg);
      for (let i = 0; i < 5; i++)
        out += line([200 + i * 56, 130 + hash(i, 2) * 10], [208 + i * 56, 160 + hash(i, 3) * 20], BLUE.pale, 3);
      return (
        out +
        route(
          [
            [300, 320],
            [320, 280],
            [380, 260],
            [430, 230],
            [380, 200],
          ],
          f,
        ) +
        circle([320, 280], 70 + wave(f) * 4, BLUE.light, 1, "none", 'opacity=".4"')
      );
    },
    [320, 260],
  ],
  explore_lakes: [
    "THE LAKES",
    (f) => {
      let out = "";
      for (let i = 0; i < 4; i++)
        out += path(
          `M${150 + i * 14} ${220}Q${200 + i * 10} ${130 + i * 12} ${330} ${150 + i * 14}Q${470 - i * 10} ${130 + i * 12} ${500 - i * 14} ${230}Q${420} ${320 - i * 10} ${240} ${300 - i * 10}Q${150 + i * 14} ${280} ${150 + i * 14} ${220}Z`,
          BLUE.light,
          1.3,
          "none",
          `opacity="${1 - i * 0.2}"`,
        );
      for (const [x, y, d] of [
        [230, 220, 4],
        [320, 210, 9],
        [400, 240, 6],
        [300, 260, 12],
      ] as [number, number, number][])
        out += text(x - 4, y + 4, 11, String(d), BLUE.pale);
      return (
        out +
        circle([360 + wave(f) * 20, 190], 5, "#ffffff", 1, "#ffffff") +
        route(
          [
            [130, 300],
            [210, 310],
            [300, 290],
            [380, 270],
          ],
          f,
        )
      );
    },
    [320, 220],
  ],
  explore_deep: [
    "THE DEEP WILD",
    (f) => {
      let out = circle(C, 130, BLUE.light, 1.4) + circle(C, 90, BLUE.mid, 1, "none", 'stroke-dasharray="3 5"');
      for (let i = 0; i < 8; i++) {
        const a = rad(i * 45);
        out += line(
          [C[0] + Math.cos(a) * 130, C[1] + Math.sin(a) * 130],
          [C[0] + Math.cos(a) * 146, C[1] + Math.sin(a) * 146],
          BLUE.pale,
          2,
        );
      }
      out += poly(
        [
          [C[0], C[1] - 100],
          [C[0] + 14, C[1]],
          [C[0], C[1] + 100],
          [C[0] - 14, C[1]],
        ],
        "none",
        BLUE.pale,
        1.4,
      );
      return (
        out +
        `<g transform="rotate(${f * 6 - 10} ${C[0]} ${C[1]})">${poly(
          [
            [C[0], C[1] - 120],
            [C[0] + 10, C[1]],
            [C[0] - 10, C[1]],
          ],
          "#ffffff",
          "#ffffff",
          1,
        )}</g>` +
        route(
          [
            [170, 290],
            [240, 250],
            [300, 220],
            [350, 180],
            [420, 130],
          ],
          f,
        )
      );
    },
    C,
  ],
  explore_flats: [
    "THE SALT FLATS",
    (f) => {
      let out =
        line([60, 200], [580, 200], BLUE.pale, 1.6) +
        circle([430, 130], 28 + (f % 2) * 2, BLUE.pale, 1.6, "url(#flare)") +
        glow([430, 130], 90, 0.3);
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 6 + r; c++)
          out += poly(
            [
              [80 + c * 70 - r * 8, 210 + r * 24],
              [140 + c * 70 - r * 8, 210 + r * 24],
              [150 + c * 70 - r * 10, 230 + r * 28],
              [70 + c * 70 - r * 10, 230 + r * 28],
            ],
            "none",
            BLUE.light,
            0.9,
            `opacity="${0.8 - r * 0.15}"`,
          );
      return (
        out +
        route(
          [
            [110, 300],
            [210, 270],
            [310, 250],
            [400, 232],
          ],
          f,
        )
      );
    },
    [310, 250],
  ],
  explore_forest: [
    "THE SUNKEN FOREST",
    (f) => {
      let out = line([60, 210], [580, 210], BLUE.pale, 1.8);
      for (let i = 0; i < 8; i++) {
        const x = 110 + i * 56;
        const h = 50 + hash(i, 5) * 50;
        out +=
          line([x, 210], [x, 210 - h], BLUE.pale, 3) +
          circle([x, 210 - h], 18 + hash(i, 6) * 8, BLUE.light, 1.3, "url(#hull)");
        out +=
          line([x, 210], [x, 210 + h * 0.8], BLUE.light, 2, 'opacity=".5"') +
          circle(
            [x, 210 + h * 0.8],
            18 + hash(i, 6) * 8,
            BLUE.light,
            1.1,
            "none",
            `opacity="${0.4 + 0.15 * wave(f, i)}"`,
          );
      }
      return (
        out +
        route(
          [
            [100, 340],
            [220, 320],
            [340, 340],
            [460, 320],
          ],
          f,
        )
      );
    },
    [330, 210],
  ],
  explore_coast: [
    "THE STORM COAST",
    (f) => {
      let out = path("M60 250Q140 230 200 260Q240 300 300 290L580 290V330H60Z", BLUE.pale, 1.5, "url(#rock)");
      for (let i = 0; i < 4; i++)
        out += path(
          `M${310 + i * 6} ${300 + i * 12}q20 ${-12 + wave(f, i) * 6} 40 0t40 0t40 0t40 0`,
          BLUE.light,
          1.4,
          "none",
          `opacity="${1 - i * 0.2}"`,
        );
      const tower =
        poly(
          [
            [130, 250],
            [160, 250],
            [152, 150],
            [138, 150],
          ],
          "url(#hull)",
          BLUE.pale,
          1.6,
        ) +
        poly(
          [
            [132, 150],
            [158, 150],
            [145, 132],
          ],
          "url(#plate)",
          BLUE.pale,
          1.4,
        );
      let beam = "";
      if (f % 2)
        beam = poly(
          [
            [145, 142],
            [420, 100],
            [420, 190],
          ],
          BLUE.light,
          BLUE.light,
          0.5,
          'fill-opacity=".2"',
        );
      for (let i = 0; i < 3; i++)
        out += path(
          `M${280 + i * 60} ${70 + i * 18}l20 -14 -8 22 22 -10`,
          "#ffffff",
          1.6,
          "none",
          `opacity="${(f + i) % 3 ? 0.3 : 1}"`,
        );
      return out + tower + beam;
    },
    [145, 200],
  ],
  explore_ruins: [
    "THE DROWNED RUINS",
    (f) => {
      let out = line([60, 200], [580, 200], BLUE.pale, 1.6);
      for (let i = 0; i < 6; i++) {
        const x = 100 + i * 74;
        const h = 30 + hash(i, 8) * 60;
        out +=
          poly(
            [
              [x, 200],
              [x + 50, 200],
              [x + 50, 200 + h],
              [x, 200 + h],
            ],
            "url(#rock)",
            BLUE.light,
            1.3,
            'fill-opacity=".7"',
          ) +
          poly(
            [
              [x + 14, 200 + h - 22],
              [x + 30, 200 + h - 22],
              [x + 30, 200 + h],
              [x + 14, 200 + h],
            ],
            "none",
            BLUE.pale,
            1,
          );
      }
      for (let i = 0; i < 4; i++)
        out += path(`M80 ${222 + i * 30}q60 ${wave(f, i) * 4} 120 0t120 0t120 0`, BLUE.line, 1, "none", 'opacity=".5"');
      return (
        out +
        route(
          [
            [100, 120],
            [220, 150],
            [340, 130],
            [460, 160],
          ],
          f,
        )
      );
    },
    [330, 240],
  ],
  explore_rift: [
    "THE RIFT EDGE",
    (f) => {
      const crack = path("M300 90L330 150L300 200L350 250L320 320", BLUE.pale, 3);
      const left = path("M60 200L300 200L330 150L300 90L60 90Z", BLUE.light, 1.3, "url(#rock)");
      const right = path("M580 220L350 250L320 320L580 320Z", BLUE.light, 1.3, "url(#rock)");
      let glowing = glow([320, 200], 90 + (f % 2) * 8, 0.45);
      for (let i = 0; i < 6; i++)
        glowing += line(
          [310 + hash(i, f) * 30, 280 - i * 28],
          [310 + hash(i, f) * 30, 270 - i * 28 - 10],
          "#ffffff",
          1.4,
        );
      return (
        left +
        right +
        glowing +
        crack +
        route(
          [
            [100, 150],
            [180, 170],
            [250, 160],
            [285, 130],
          ],
          f,
        )
      );
    },
    [320, 200],
  ],
  explore_world: [
    "THE FAR SIDE",
    (f) => {
      let out = circle(C, 118, BLUE.pale, 1.8, "url(#hull)");
      for (let i = -2; i <= 2; i++)
        out += `<ellipse cx="${C[0]}" cy="${C[1] + i * 44}" rx="${Math.sqrt(118 * 118 - (i * 44) ** 2).toFixed(1)}" ry="10" fill="none" stroke="${BLUE.light}" stroke-width="1"/>`;
      for (let i = 0; i < 4; i++)
        out += `<ellipse cx="${C[0]}" cy="${C[1]}" rx="${(20 + i * 24 + ((f * 6) % 24)) % 118}" ry="118" fill="none" stroke="${BLUE.mid}" stroke-width="1" opacity=".7"/>`;
      return (
        out +
        route(
          [
            [250, 250],
            [290, 210],
            [330, 190],
            [370, 170],
          ],
          f,
        )
      );
    },
    C,
  ],
};

export const EXPLORE_SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(EXPLORE).map(([id, [label, draw, focus]]) => [
    id,
    (f: number) => card(draw(f), label, focus, f, 60, [430, 330]),
  ]),
);
