import { BLUE, circle, line, path, poly } from "./hud";
import { bench } from "./hud-lab";
import { at, card, glow, Scene, sparks, wave } from "./hud-kit";

/** Drawn around the origin, like the other bench pieces. */
const PIECES: Record<string, [string, (f: number) => string]> = {
  craft_sensor_array: [
    "SENSOR ARRAY",
    (f) =>
      path("M-70 10Q0 -70 70 10Z", BLUE.pale, 1.8, "url(#hull)") +
      line([0, -14], [0, 56], BLUE.pale, 4) +
      line([-30, 56], [30, 56], BLUE.pale, 5) +
      circle([0, -26], 5, "#ffffff", 1, "#ffffff") +
      [0, 1, 2]
        .map(
          (i) =>
            `<path d="M${-22 - i * 16} ${-44 - i * 12}Q0 ${-66 - i * 16} ${22 + i * 16} ${-44 - i * 12}" fill="none" stroke="${BLUE.light}" stroke-width="1.4" opacity="${(i + f) % 3 === 0 ? 0.9 : 0.3}"/>`,
        )
        .join(""),
  ],
  craft_cable: [
    "CABLE SPOOL",
    (f) =>
      `<ellipse cx="0" cy="-20" rx="70" ry="16" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.8"/>` +
      `<ellipse cx="0" cy="30" rx="70" ry="16" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.8"/>` +
      line([-70, -20], [-70, 30], BLUE.pale, 1.8) +
      line([70, -20], [70, 30], BLUE.pale, 1.8) +
      [0, 1, 2, 3, 4].map((i) => path(`M${-56 + i * 24} ${-8 + (f % 2)}q8 20 0 40`, BLUE.light, 2.4, "none")).join("") +
      path("M70 24Q110 40 120 10", "#ffffff", 2, "none"),
  ],
  craft_gyro: [
    "GYRO STABILIZER",
    (f) =>
      [0, 1, 2]
        .map(
          (i) =>
            `<ellipse cx="0" cy="0" rx="${90 - i * 20}" ry="${28 + i * 16}" fill="none" stroke="${i ? BLUE.light : BLUE.pale}" stroke-width="${2.4 - i * 0.4}" transform="rotate(${i * 60 + f * 15})"/>`,
        )
        .join("") +
      circle([0, 0], 16, BLUE.pale, 1.6, "url(#crystal)") +
      glow([0, 0], 90, 0.25),
  ],
  craft_plasma_conduit: [
    "PLASMA CONDUIT",
    (f) =>
      `<rect x="-100" y="-22" width="200" height="44" rx="22" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.8"/>` +
      [-60, -20, 20, 60].map((x) => line([x, -22], [x, 22], BLUE.pale, 3)).join("") +
      path("M-92 0H92", "#ffffff", 3, "none", `stroke-dasharray="14 12" stroke-dashoffset="${-f * 8}"`) +
      glow([0, 0], 110, 0.2),
  ],
  fab_rivets: [
    "RIVET PACK",
    (f) =>
      `<rect x="-90" y="-40" width="180" height="80" rx="6" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.6"/>` +
      Array.from({ length: 18 }, (_, i) => {
        const x = -76 + (i % 6) * 30;
        const y = -22 + Math.floor(i / 6) * 22;
        return circle([x, y], 6, BLUE.pale, 1.3, "url(#crystal)") + line([x - 3, y], [x + 3, y], BLUE.light, 1);
      }).join("") +
      sparks([60, -40], 36, f, 3, 3),
  ],
  fab_hull_plating: [
    "HULL PLATING",
    (f) =>
      [0, 1, 2]
        .map((i) =>
          poly(
            [
              [-80 + i * 12, -50 + i * 26],
              [80 + i * 12, -62 + i * 26],
              [88 + i * 12, -34 + i * 26],
              [-72 + i * 12, -22 + i * 26],
            ],
            "url(#hull)",
            i === f % 3 ? "#ffffff" : BLUE.pale,
            1.8,
          ),
        )
        .join("") + [0, 1, 2].map((i) => circle([-62 + i * 12, -38 + i * 26], 3, BLUE.light, 1, BLUE.light)).join(""),
  ],
  fab_springs: [
    "SPRING COILS",
    (f) => {
      const squeeze = 1 - 0.18 * wave(f);
      let d = "M-90 0";
      for (let i = 0; i < 9; i++)
        d += `q${(180 / 9) * 0.5 * squeeze} ${(i % 2 ? 1 : -1) * 44} ${(180 / 9) * squeeze} 0`;
      return (
        path(d, BLUE.pale, 3, "none") +
        line([-92, -30], [-92, 30], BLUE.light, 4) +
        line([88, -30], [88, 30], BLUE.light, 4)
      );
    },
  ],
  fab_lattice: [
    "ARMOR LATTICE",
    (f) => {
      let out = "";
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++) {
          const x = -75 + c * 50 + (r % 2) * 25;
          const y = -44 + r * 44;
          const pts: [number, number][] = Array.from({ length: 6 }, (_, k) => [
            x + 26 * Math.cos((Math.PI / 3) * k + Math.PI / 6),
            y + 26 * Math.sin((Math.PI / 3) * k + Math.PI / 6),
          ]);
          out += poly(pts, (r + c) % 4 === f % 4 ? "url(#crystal)" : "url(#hull)", BLUE.pale, 1.5);
        }
      return out;
    },
  ],
  fab_optics: [
    "OPTIC LENSES",
    (f) =>
      `<ellipse cx="0" cy="0" rx="34" ry="64" fill="url(#crystal)" fill-opacity=".7" stroke="${BLUE.pale}" stroke-width="2"/>` +
      line([-110, -20], [-30, -6], BLUE.light, 1.6) +
      line([-110, 20], [-30, 6], BLUE.light, 1.6) +
      line([30, -6], [110, 0], "#ffffff", 2.4) +
      line([30, 6], [110, 0], "#ffffff", 2.4) +
      circle([110, 0], 4 + (f % 2) * 2, "#ffffff", 1, "#ffffff") +
      glow([60, 0], 70, 0.2),
  ],
  fab_shock_plating: [
    "SHOCK PLATING",
    (f) =>
      poly(
        [
          [-60, -60],
          [60, -60],
          [74, 0],
          [60, 60],
          [-60, 60],
          [-74, 0],
        ],
        "url(#hull)",
        BLUE.pale,
        2,
      ) +
      [0, 1, 2]
        .map((i) =>
          circle([0, 0], 14 + ((i + f) % 3) * 16, BLUE.light, 1.4, "none", `opacity="${0.9 - ((i + f) % 3) * 0.3}"`),
        )
        .join("") +
      circle([0, 0], 6, "#ffffff", 1, "#ffffff"),
  ],
  fab_housing: [
    "POWER HOUSING",
    (f) =>
      `<rect x="-60" y="-56" width="120" height="112" rx="14" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="2"/>` +
      `<rect x="-36" y="-32" width="72" height="64" rx="8" fill="#02081a" stroke="${BLUE.light}" stroke-width="1.4"/>` +
      circle([0, 0], 14 + (f % 2) * 3, "#ffffff", 1.6, "url(#flare)") +
      [-44, 44].map((x) => line([x, -56], [x, -76], BLUE.pale, 4)).join("") +
      glow([0, 0], 90, 0.3),
  ],
  fab_tiles: [
    "REACTIVE TILES",
    (f) =>
      Array.from({ length: 12 }, (_, i) => {
        const x = -90 + (i % 4) * 46;
        const y = -50 + Math.floor(i / 4) * 40;
        const hot = i === (f * 5) % 12;
        return `<rect x="${x}" y="${y}" width="40" height="34" rx="4" fill="${hot ? "url(#flare)" : "url(#hull)"}" stroke="${hot ? "#ffffff" : BLUE.pale}" stroke-width="1.5"/>`;
      }).join(""),
  ],
  fab_frame: [
    "RESONANT FRAME",
    (f) =>
      `<rect x="-80" y="-56" width="160" height="112" fill="none" stroke="${BLUE.pale}" stroke-width="4"/>` +
      line([-80, -56], [80, 56], BLUE.pale, 2.4) +
      line([80, -56], [-80, 56], BLUE.pale, 2.4) +
      path(`M-70 0Q-35 ${-28 * wave(f)} 0 0T70 0`, "#ffffff", 2, "none") +
      glow([0, 0], 100, 0.2),
  ],
  fab_void_plating: [
    "VOID PLATING",
    (f) =>
      poly(
        [
          [-70, -56],
          [70, -56],
          [90, 56],
          [-90, 56],
        ],
        "#02081a",
        BLUE.pale,
        2.2,
      ) +
      [0, 1, 2, 3]
        .map(
          (i) =>
            `<ellipse cx="0" cy="0" rx="${14 + i * 14}" ry="${8 + i * 8}" fill="none" stroke="${BLUE.light}" stroke-width="1.3" transform="rotate(${f * 20 + i * 25})" opacity="${0.9 - i * 0.2}"/>`,
        )
        .join("") +
      glow([0, 0], 100, 0.3),
  ],
};

PIECES.fab_rail_slugs = ["RAIL SLUGS", PIECES.fab_rivets[1]];

export const FAB_SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(PIECES).map(([id, [label, draw]]) => [
    id,
    (f: number) =>
      bench() +
      glow([320, 190], 120, 0.18) +
      at(320, 190, 1.2, 0, draw(f)) +
      card("", label, [320, 190], f, 84, [430, 322]),
  ]),
);
