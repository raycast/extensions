import { BLUE, circle, line, P, path, poly, Pt } from "./hud";
import { hydroponics, leaf, PlantDrawer } from "./hud-grow";
import { rad, Scene, wave } from "./hud-kit";
import { hash } from "./util";

const berry = (c: Pt, r: number) => circle(c, r, BLUE.pale, 1.2, "url(#crystal)", 'fill-opacity=".85"');

/** One plant per crop, drawn at five growth stages (stage 0 is a sprout). */
const PLANTS: Record<string, [string, PlantDrawer]> = {
  berry_trellis: [
    "BERRY TRELLIS",
    (cx, by, s) => {
      const h = 20 + s * 16;
      let out =
        line([cx - 12, by], [cx - 12, by - h], BLUE.pale, 1.6) +
        line([cx + 12, by], [cx + 12, by - h], BLUE.pale, 1.6) +
        path(`M${cx - 12} ${by - h * 0.3}Q${cx} ${by - h * 0.5} ${cx + 12} ${by - h * 0.7}`, BLUE.light, 1.4);
      for (let i = 0; i < s; i++) out += berry([cx - 8 + (i % 2) * 14, by - 10 - i * 12], 4 + (i % 2));
      return out + leaf([cx, by - h * 0.4], [cx - 10, by - h * 0.8], 4);
    },
  ],
  thorn_hedge: [
    "THORN HEDGE",
    (cx, by, s) => {
      const h = 16 + s * 14;
      let out = poly(
        [
          [cx - 20, by],
          [cx - 16, by - h],
          [cx + 16, by - h],
          [cx + 20, by],
        ],
        "url(#hull)",
        BLUE.light,
        1.3,
      );
      for (let i = 0; i < s + 1; i++)
        out +=
          poly(
            [
              [cx - 18, by - 8 - i * 10],
              [cx - 28, by - 12 - i * 10],
              [cx - 18, by - 14 - i * 10],
            ],
            "#ffffff",
            "#ffffff",
            0.5,
          ) +
          poly(
            [
              [cx + 18, by - 12 - i * 10],
              [cx + 28, by - 16 - i * 10],
              [cx + 18, by - 18 - i * 10],
            ],
            "#ffffff",
            "#ffffff",
            0.5,
          );
      return out;
    },
  ],
  mist_vats: [
    "MIST VATS",
    (cx, by, s, f) => {
      const h = 14 + s * 10;
      let out = path(
        `M${cx - 18} ${by}V${by - 34}Q${cx} ${by - 40} ${cx + 18} ${by - 34}V${by}Z`,
        BLUE.pale,
        1.4,
        "url(#hull)",
      );
      for (let i = 0; i < s + 1; i++)
        out += path(
          `M${cx - 14 + i * 6} ${by - 36 - i * 8}q${6 + wave(f, i) * 3} -8 12 0`,
          BLUE.light,
          6,
          "none",
          'opacity=".25"',
        );
      return out + leaf([cx, by - 34], [cx - 6, by - 34 - h], 5 + s);
    },
  ],
  ember_orchard: [
    "EMBER ORCHARD",
    (cx, by, s, f) => {
      let out = line([cx, by], [cx, by - 20 - s * 12], BLUE.pale, 2.4);
      for (let i = 0; i < s; i++)
        out += path(
          `M${cx + (i % 2 ? 6 : -6)} ${by - 14 - i * 12}q-8 8 0 16q8 -8 0 -16Z`,
          "#ffffff",
          1.2,
          "url(#flare)",
          `opacity="${(f + i) % 2 ? 1 : 0.7}"`,
        );
      return out;
    },
  ],
  moss_beds: [
    "MOSS BEDS",
    (cx, by, s, f) => {
      let out = path(`M${cx - 26} ${by}Q${cx} ${by - 12 - s * 8} ${cx + 26} ${by}Z`, BLUE.pale, 1.4, "url(#hull)");
      for (let i = 0; i < 3 + s * 2; i++)
        out += line(
          [cx - 20 + hash(i, 1) * 40, by - 2],
          [cx - 20 + hash(i, 1) * 40 + wave(f, i) * 2, by - 6 - hash(i, 2) * (8 + s * 4)],
          BLUE.light,
          1.1,
        );
      return out;
    },
  ],
  orchid_house: [
    "ORCHID HOUSE",
    (cx, by, s, f) => {
      const top: Pt = [cx, by - 20 - s * 12];
      let out = line([cx, by], top, BLUE.pale, 1.6);
      for (let i = 0; i < 5; i++)
        out += `<path d="M${P(top)}l${Math.cos(rad(i * 72 - 90)) * (6 + s * 3)} ${Math.sin(rad(i * 72 - 90)) * (6 + s * 3)}" stroke="${BLUE.pale}" stroke-width="${2 + s * 0.4}" stroke-linecap="round" opacity="${(0.4 + 0.12 * ((f + i) % 3)).toFixed(2)}"/>`;
      return out;
    },
  ],
  sunfruit_grove: [
    "SUNFRUIT GROVE",
    (cx, by, s, f) => {
      const h = 20 + s * 14;
      let out = line([cx, by], [cx, by - h], BLUE.pale, 3);
      out += circle([cx, by - h], 8 + s * 3, BLUE.light, 1.2, "none", 'opacity=".6"');
      for (let i = 0; i < s; i++)
        out += circle(
          [cx - 10 + (i % 3) * 10, by - h - 6 + (i % 2) * 8],
          4,
          "#ffffff",
          1,
          "url(#flare)",
          `opacity="${(f + i) % 2 ? 1 : 0.7}"`,
        );
      return out;
    },
  ],
};

export const CROP_SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(PLANTS).map(([id, [label, draw]]) => [`hydro_${id}`, (f: number) => hydroponics(draw, f, label)]),
);
