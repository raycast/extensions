import { BLUE, circle, line, path, poly, Pt } from "./hud";
import { BENCH, bench, flame, pot, steam } from "./hud-lab";
import { at, card, glow, mirrored, Scene, sparks, wave } from "./hud-kit";
import { hash } from "./util";

const bowl = (c: Pt, w: number, fill = "url(#crystal)") =>
  path(`M${c[0] - w} ${c[1]}Q${c[0]} ${c[1] + w * 0.9} ${c[0] + w} ${c[1]}Z`, BLUE.pale, 1.7, "url(#hull)") +
  `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${w}" ry="${w * 0.16}" fill="${fill}" fill-opacity=".8" stroke="${BLUE.pale}" stroke-width="1.4"/>`;

const fishShape = (c: Pt, s: number, f = 0) =>
  path(
    `M${c[0] - s / 2} ${c[1]}Q${c[0]} ${c[1] - s * 0.3} ${c[0] + s / 2} ${c[1]}Q${c[0]} ${c[1] + s * 0.3} ${c[0] - s / 2} ${c[1]}Z`,
    BLUE.pale,
    1.4,
    "url(#crystal)",
    'fill-opacity=".8"',
  ) +
  poly(
    [
      [c[0] - s / 2, c[1]],
      [c[0] - s * 0.7, c[1] - s * 0.16 + wave(f) * 2],
      [c[0] - s * 0.7, c[1] + s * 0.16],
    ],
    "url(#hull)",
    BLUE.light,
    1,
  );

const berry = (c: Pt, r = 8) => circle(c, r, BLUE.pale, 1.3, "url(#crystal)", 'fill-opacity=".85"');

const COOK: Record<string, [string, (f: number) => string]> = {
  craft_fish_ration: [
    "FISH RATION",
    (f) =>
      flame(320, 262, f) +
      path("M250 230Q320 250 390 230L380 214H260Z", BLUE.pale, 1.7, "url(#hull)") +
      line([390, 224], [460, 204], BLUE.pale, 6) +
      fishShape([310, 214], 70, f) +
      steam(320, 196, f, 2),
  ],
  craft_eel_skewer: [
    "EEL SKEWER",
    (f) =>
      flame(250, 262, f) +
      flame(390, 262, f) +
      line([170, 214], [470, 186], BLUE.pale, 3) +
      path("M200 210Q230 170 260 206T320 200T380 194T440 190", "#ffffff", 7, "none", 'opacity=".5"') +
      path("M200 210Q230 170 260 206T320 200T380 194T440 190", BLUE.light, 3.4) +
      sparks([320, 196], 50, f, 5, 3),
  ],
  craft_ray_stew: [
    "RAY STEW",
    (f) =>
      flame(320, 262, f) +
      pot(320, f, "#2d78dc") +
      path("M310 216Q320 180 330 150", BLUE.pale, 3) +
      poly(
        [
          [310, 216],
          [350, 190],
          [320, 170],
        ],
        "url(#crystal)",
        BLUE.pale,
        1.4,
      ) +
      steam(320, 200, f, 3),
  ],
  craft_compote: [
    "BERRY COMPOTE",
    (f) =>
      [0, 1, 2, 3, 4, 5]
        .map((i) => berry([270 + (i % 3) * 20 + (i > 2 ? 10 : 0), 270 - Math.floor(i / 3) * 18], 10))
        .join("") +
      poly(
        [
          [240, 200],
          [400, 200],
          [384, 300],
          [256, 300],
        ],
        "url(#hull)",
        BLUE.pale,
        1.6,
      ) +
      path("M240 200h160", BLUE.pale, 3.5) +
      path("M256 240h128", BLUE.mid, 1) +
      steam(320, 190, f, 2),
  ],
  craft_thorn_stew: [
    "THORN STEW",
    (f) =>
      bowl([320, 230], 90) +
      [0, 1, 2, 3].map((i) => path(`M${280 + i * 22} 226l${(i % 2 ? 1 : -1) * 6} -26 6 24`, "#ffffff", 1.5)).join("") +
      steam(320, 214, f, 3),
  ],
  craft_ember_curry: [
    "EMBER CURRY",
    (f) =>
      flame(320, 262, f) +
      pot(320, f, "#ffffff") +
      [0, 1, 2, 3, 4]
        .map((i) => circle([270 + i * 25, 190 - ((f + i) % 3) * 12], 3, "#ffffff", 0.8, "#ffffff"))
        .join("") +
      steam(320, 200, f, 2),
  ],
  craft_mist_broth: [
    "MIST BROTH",
    (f) =>
      bowl([320, 240], 70) +
      [0, 1, 2, 3]
        .map((i) =>
          path(`M${230 + i * 60} ${196 + wave(f, i) * 4}q30 -12 60 0`, BLUE.light, 10, "none", 'opacity=".2"'),
        )
        .join("") +
      path("M290 232Q320 244 350 232", BLUE.pale, 1.4) +
      steam(320, 220, f, 2),
  ],
  craft_sun_tart: [
    "SUNFRUIT TART",
    (f) =>
      `<ellipse cx="320" cy="262" rx="110" ry="${26}" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.8"/>` +
      `<ellipse cx="320" cy="252" rx="92" ry="20" fill="url(#plate)" fill-opacity=".85" stroke="${BLUE.pale}" stroke-width="1.4"/>` +
      [0, 1, 2, 3, 4, 5]
        .map((i) => circle([270 + i * 20, 250 + (i % 2) * 4], 9, "#ffffff", 1.2, "url(#flare)"))
        .join("") +
      glow([320, 240], 140, 0.2 + 0.1 * (f % 2)),
  ],
  craft_leviathan_steak: [
    "LEVIATHAN STEAK",
    (f) =>
      flame(320, 270, f) +
      line([220, 244], [420, 244], BLUE.pale, 2) +
      [0, 1, 2, 3, 4].map((i) => line([230 + i * 40, 244], [230 + i * 40, 270], BLUE.mid, 1.4)).join("") +
      poly(
        [
          [240, 230],
          [400, 218],
          [410, 244],
          [250, 252],
        ],
        "url(#plate)",
        BLUE.pale,
        1.6,
      ) +
      path("M260 236L390 226M262 244L396 234", BLUE.deep, 1.4) +
      steam(320, 214, f, 3),
  ],
  craft_elder_feast: [
    "ELDER FEAST",
    (f) =>
      poly(
        [
          [160, 258],
          [480, 258],
          [500, BENCH],
          [140, BENCH],
        ],
        "url(#hull)",
        BLUE.pale,
        1.6,
      ) +
      bowl([220, 250], 44) +
      bowl([420, 250], 44) +
      `<ellipse cx="320" cy="250" rx="70" ry="14" fill="url(#plate)" stroke="${BLUE.pale}" stroke-width="1.5"/>` +
      circle([320, 222], 22, "#ffffff", 1.6, "url(#flare)") +
      glow([320, 220], 130, 0.3) +
      steam(220, 236, f, 2) +
      steam(420, 236, f, 2),
  ],
};

const bottle = (inner: string, body: string) =>
  poly(
    [
      [-12, -76],
      [12, -76],
      [12, -50],
      [44, -10],
      [44, 60],
      [-44, 60],
      [-44, -10],
      [-12, -50],
    ],
    body,
    BLUE.pale,
    1.8,
  ) +
  `<rect x="-14" y="-90" width="28" height="14" rx="3" fill="url(#plate)" stroke="${BLUE.pale}" stroke-width="1.5"/>` +
  inner;

const bubbles = (f: number, n = 4) =>
  Array.from({ length: n }, (_, i) =>
    circle([-24 + hash(i, 1, 5) * 48, 50 - ((f + i) % 4) * 16], 2 + hash(i, 2, 5) * 3, BLUE.pale, 1),
  ).join("");

const BREW: Record<string, [string, (f: number) => string]> = {
  brew_ironblood: [
    "IRONBLOOD SERUM",
    (f) =>
      bottle(
        `<path d="M-24 -10H24V50H-24Z" fill="${BLUE.line}" opacity=".6"/>` +
          path("M0 -2L20 6V30Q0 48 -20 30V6Z", "#ffffff", 1.6, "none") +
          bubbles(f),
        "url(#hull)",
      ),
  ],
  brew_chronos: [
    "CHRONOS ELIXIR",
    (f) =>
      poly(
        [
          [-40, -80],
          [40, -80],
          [4, 0],
          [40, 80],
          [-40, 80],
          [-4, 0],
        ],
        "url(#hull)",
        BLUE.pale,
        1.8,
      ) +
      path(`M-30 ${60}Q0 ${40 - (f % 4) * 4} 30 60Z`, BLUE.light, 1.2, "url(#crystal)", 'fill-opacity=".7"') +
      line([0, 0], [0, 56 - (f % 2) * 8], "#ffffff", 2) +
      line([-48, -86], [48, -86], BLUE.pale, 5) +
      line([-48, 86], [48, 86], BLUE.pale, 5) +
      circle([0, 0], 70 + (f % 2) * 4, BLUE.light, 1, "none", 'stroke-dasharray="5 6"'),
  ],
  brew_cornucopia: [
    "CORNUCOPIA DRAUGHT",
    (f) =>
      path("M-80 60Q-60 -60 40 -50Q90 -40 80 20Q60 -10 20 -10Q-20 0 -40 60Z", BLUE.pale, 1.8, "url(#hull)") +
      [0, 1, 2, 3, 4]
        .map((i) =>
          circle([40 + i * 14 - (i % 2) * 6, -60 + i * 22 + wave(f, i) * 3], 9, BLUE.pale, 1.3, "url(#flare)"),
        )
        .join("") +
      glow([80, 10], 70, 0.3),
  ],
  brew_warlord: [
    "WARLORD'S SERUM",
    (f) =>
      bottle(
        path("M-22 8Q0 -14 22 8V28Q0 14 -22 28Z", "#ffffff", 1.6, "url(#flare)") +
          line([0, 8], [0, 40], "#ffffff", 1.6) +
          bubbles(f, 5),
        "url(#hull)",
      ) + sparks([0, 0], 90, f, 6, 4),
  ],
  brew_stillwater: [
    "STILLWATER TONIC",
    (f) =>
      bowl([0, 10], 90) +
      [0, 1, 2]
        .map(
          (i) =>
            `<ellipse cx="0" cy="10" rx="${30 + i * 22 + ((f * 4) % 20)}" ry="${5 + i * 3}" fill="none" stroke="${BLUE.light}" stroke-width="1.2" opacity="${0.8 - i * 0.2}"/>`,
        )
        .join("") +
      circle([0, 10], 4, "#ffffff", 1, "#ffffff"),
  ],
};

const ENGINE: Record<string, [string, (f: number) => string]> = {
  craft_capacitor: [
    "CAPACITOR BANK",
    (f) =>
      [0, 1, 2, 3]
        .map(
          (i) =>
            `<rect x="${-100 + i * 54}" y="-50" width="44" height="100" rx="8" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.6"/>` +
            `<rect x="${-92 + i * 54}" y="${-38 + ((f + i) % 3) * 8}" width="28" height="${70 - ((f + i) % 3) * 8}" fill="${BLUE.light}" opacity=".5"/>` +
            line([-78 + i * 54, -50], [-78 + i * 54, -64], BLUE.pale, 4),
        )
        .join("") +
      path("M-78 -64H78", BLUE.pale, 2) +
      path(`M-60 -64l10 -22 -10 8 14 -20`, "#ffffff", 1.6, "none", `opacity="${f % 2 ? 1 : 0.3}"`),
  ],
  craft_processor: [
    "QUANTUM PROCESSOR",
    (f) =>
      `<rect x="-60" y="-60" width="120" height="120" rx="6" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.8"/>` +
      `<rect x="-30" y="-30" width="60" height="60" fill="none" stroke="${BLUE.light}" stroke-width="1.4"/>` +
      Array.from(
        { length: 8 },
        (_, i) =>
          line([-52 + i * 15, -60], [-52 + i * 15, -80], BLUE.pale, 3) +
          line([-52 + i * 15, 60], [-52 + i * 15, 80], BLUE.pale, 3) +
          line([-60, -52 + i * 15], [-80, -52 + i * 15], BLUE.pale, 3) +
          line([60, -52 + i * 15], [80, -52 + i * 15], BLUE.pale, 3),
      ).join("") +
      circle([0, 0], 12 + (f % 2) * 3, "#ffffff", 1.6, "url(#flare)") +
      glow([0, 0], 80, 0.3),
  ],
  craft_singularity: [
    "SINGULARITY CORE",
    (f) =>
      `<ellipse cx="0" cy="0" rx="96" ry="26" fill="none" stroke="${BLUE.pale}" stroke-width="3" transform="rotate(${-14 + f * 3})" opacity=".8"/>` +
      `<ellipse cx="0" cy="0" rx="72" ry="18" fill="none" stroke="${BLUE.light}" stroke-width="1.6" transform="rotate(${-14 + f * 3})"/>` +
      circle([0, 0], 36, BLUE.pale, 1.8, "#02081a") +
      glow([0, 0], 110, 0.35),
  ],
};

const MONSTER: Record<string, [string, (f: number) => string]> = {
  fight_crawler: [
    "SPINE CRAWLER",
    (f) => {
      let out = poly(
        [
          [-70, 10],
          [-40, -18],
          [50, -18],
          [80, 6],
          [50, 30],
          [-40, 30],
        ],
        "url(#hull)",
        BLUE.pale,
        1.8,
      );
      for (let i = 0; i < 7; i++)
        out += line([-44 + i * 18, -18], [-44 + i * 18 + (i % 2 ? 4 : -4), -50 - (i % 3) * 8], "#ffffff", 2);
      for (let i = 0; i < 4; i++)
        out += path(`M${-40 + i * 28} 30l${(i % 2 ? 1 : -1) * 12 + wave(f, i) * 5} 28`, BLUE.light, 3);
      return out + circle([62, 0], 4, "#ffffff", 1, "#ffffff");
    },
  ],
  fight_hulk: [
    "MIRE HULK",
    (f) =>
      poly(
        mirrored([
          [0, -80],
          [50, -70],
          [86, -20],
          [78, 50],
          [40, 70],
        ]),
        "url(#hull)",
        BLUE.pale,
        1.8,
      ) +
      poly(
        [
          [-86, -30],
          [-120, -70],
          [-100, -10],
        ],
        "url(#plate)",
        BLUE.pale,
        1.5,
      ) +
      poly(
        [
          [86, -30],
          [120, -70],
          [100, -10],
        ],
        "url(#plate)",
        BLUE.pale,
        1.5,
      ) +
      circle([-22, -30], 7, "#ffffff", 1.4, f % 2 ? "#ffffff" : BLUE.bg) +
      circle([22, -30], 7, "#ffffff", 1.4, f % 2 ? "#ffffff" : BLUE.bg) +
      path("M-34 14L-22 24L-10 14L2 24L14 14L26 24L34 14", BLUE.pale, 2) +
      path("M-60 40Q0 60 60 40", BLUE.mid, 1.2),
  ],
  fight_voidstalker: [
    "VOID STALKER",
    (f) => {
      let out = "";
      for (let i = 0; i < 3; i++)
        out += path(
          `M${-40 + i * 6 + wave(f, i) * 4} 70Q${-60 + i * 8} 0 ${-10 + i * 4} -70Q${30 + i * 6} -10 ${40 + i * 6 + wave(f, i + 1) * 4} 70Z`,
          BLUE.pale,
          1.4 - i * 0.3,
          i ? "none" : "#02081a",
          `opacity="${1 - i * 0.3}"`,
        );
      return (
        out +
        circle([-12, -30], 5, "#ffffff", 1.2, "#ffffff") +
        circle([14, -30], 5, "#ffffff", 1.2, "#ffffff") +
        sparks([0, 0], 100, f, 8, 6)
      );
    },
  ],
  fight_behemoth: [
    "RIFT BEHEMOTH",
    (f) => {
      let out = poly(
        [
          [-130, -10],
          [-70, -60],
          [60, -56],
          [120, -10],
          [110, 40],
          [-120, 40],
        ],
        "url(#hull)",
        BLUE.pale,
        1.8,
      );
      for (const x of [-100, -50, 50, 100])
        out += poly(
          [
            [x - 12, 40],
            [x + 12, 40],
            [x + 10, 86],
            [x - 10, 86],
          ],
          "url(#plate)",
          BLUE.pale,
          1.4,
        );
      return (
        out +
        poly(
          [
            [120, -10],
            [150, -26],
            [158, 4],
            [118, 20],
          ],
          "url(#plate)",
          BLUE.pale,
          1.6,
        ) +
        circle([140, -8], 4, "#ffffff", 1.2, "#ffffff") +
        [0, 1, 2, 3]
          .map((i) =>
            poly(
              [
                [-60 + i * 34, -56],
                [-48 + i * 34, -84 + (f % 2) * 4],
                [-36 + i * 34, -56],
              ],
              "url(#crystal)",
              BLUE.pale,
              1.2,
            ),
          )
          .join("")
      );
    },
  ],
  fight_herald: [
    "HOLLOW HERALD",
    (f) =>
      path("M-50 80Q-70 0 -20 -60Q0 -80 20 -60Q70 0 50 80Q20 60 0 80Q-20 60 -50 80Z", BLUE.pale, 1.8, "url(#hull)") +
      circle([0, -50], 22, BLUE.pale, 1.6, "#02081a") +
      circle([-8, -50], 3, "#ffffff", 1, "#ffffff") +
      circle([8, -50], 3, "#ffffff", 1, "#ffffff") +
      path(`M26 -48L${90 + wave(f) * 6} -90L70 -30Z`, BLUE.pale, 1.6, "url(#plate)") +
      glow([60, -60], 60, 0.3),
  ],
};

const hpBar = (f: number) =>
  `<rect x="250" y="120" width="140" height="8" fill="none" stroke="${BLUE.mid}" stroke-width="1"/><rect x="250" y="120" width="${100 - (f % 4) * 12}" height="8" fill="${BLUE.light}" opacity=".8"/>`;

const place =
  (
    draw: (f: number) => string,
    label: string,
    y: number,
    s = 1,
    extra: (f: number) => string = () => "",
    benchy = false,
  ): Scene =>
  (f) =>
    (benchy ? bench() : "") +
    glow([320, y], 120, 0.18) +
    at(320, y, s, 0, draw(f)) +
    extra(f) +
    card("", label, [320, y], f, 84, [430, 322]);

export const KITCHEN_SCENES: Record<string, Scene> = {
  ...Object.fromEntries(
    Object.entries(COOK).map(([id, [label, draw]]) => [
      id,
      (f: number) => bench() + glow([320, 230], 120, 0.15) + draw(f) + card("", label, [320, 230], f, 70, [430, 330]),
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(BREW).map(([id, [label, draw]]) => [id, place(draw, label, 196, 1.1, () => "", true)]),
  ),
  ...Object.fromEntries(
    Object.entries(ENGINE).map(([id, [label, draw]]) => [id, place(draw, label, 190, 1.2, () => "", true)]),
  ),
  ...Object.fromEntries(
    Object.entries(MONSTER).map(([id, [label, draw]]) => [id, place(draw, label, 210, 1.1, hpBar)]),
  ),
};
