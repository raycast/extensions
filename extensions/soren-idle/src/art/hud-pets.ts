import { BLUE, circle, line, P, path, poly, Pt } from "./hud";
import { bench } from "./hud-lab";
import { at, card, glow, mirrored, rad, Scene, sparks, wave } from "./hud-kit";

const eye = (c: Pt, r = 3) => circle(c, r, "#ffffff", 1, "#ffffff");

/** Companions drawn around the origin, then placed on the bench. */
const PETS: Record<string, [string, (f: number) => string]> = {
  build_hound: [
    "SCRAP HOUND",
    (f) => {
      let out =
        poly(
          [
            [-52, -20],
            [38, -20],
            [38, 20],
            [-52, 20],
          ],
          "url(#hull)",
          BLUE.pale,
          1.6,
        ) +
        poly(
          [
            [38, -14],
            [72, -4],
            [72, 14],
            [38, 20],
          ],
          "url(#plate)",
          BLUE.pale,
          1.6,
        ) +
        eye([58, -2]);
      for (const lx of [-40, -14, 14, 38]) out += line([lx, 20], [lx + wave(f, lx) * 6, 54], BLUE.light, 2.6);
      return out + path("M-52 -8Q-76 -30 -66 -48", BLUE.pale, 3);
    },
  ],
  build_wisp: [
    "SPARK WISP",
    (f) => {
      let out =
        circle([0, 0], 22, BLUE.pale, 1.6, "url(#flare)") +
        circle([0, 0], 38, BLUE.light, 1, "none", 'stroke-dasharray="6 5"');
      for (let i = 0; i < 6; i++) {
        const a = rad(i * 60 + f * 40);
        out += path(`M0 0L${P([Math.cos(a) * 44, Math.sin(a) * 44])}`, "#ffffff", 1.3);
      }
      return out;
    },
  ],
  build_moth: [
    "LANTERN MOTH",
    (f) => {
      const flap = [0.4, 1, 0.4, 1][f];
      let out = "";
      for (const k of [-1, 1])
        out += poly(
          [
            [0, 0],
            [k * 70, -46 * flap],
            [k * 60, 28],
            [k * 10, 20],
          ],
          "url(#crystal)",
          BLUE.pale,
          1.3,
        );
      return (
        out +
        poly(
          [
            [-7, -22],
            [7, -22],
            [7, 24],
            [-7, 24],
          ],
          "url(#hull)",
          BLUE.pale,
          1.4,
        ) +
        circle([0, 34], 8, "#ffffff", 1, "url(#flare)") +
        glow([0, 34], 40, 0.5)
      );
    },
  ],
  build_beetle: [
    "BRASS BEETLE",
    (f) => {
      let out =
        `<ellipse cx="0" cy="0" rx="52" ry="34" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.8"/>` +
        path("M0 -34V34", BLUE.light, 1.4) +
        path("M-30 -22Q0 -10 30 -22M-34 0H34M-30 22Q0 10 30 22", BLUE.mid, 1);
      for (const k of [-1, 1])
        for (let i = 0; i < 3; i++)
          out += path(
            `M${k * 34} ${-14 + i * 14}L${k * (64 + i * 4)} ${-20 + i * 20 + wave(f, i + k) * 3}`,
            BLUE.light,
            2.2,
          );
      return (
        out + circle([0, -42], 10, BLUE.pale, 1.4, "url(#hull)") + path("M-4 -50L-14 -66M4 -50L14 -66", BLUE.pale, 1.6)
      );
    },
  ],
  build_ward: [
    "WARD DRONE",
    (f) => {
      const hex = Array.from({ length: 6 }, (_, i): Pt => [
        Math.cos(rad(i * 60 + 30)) * 50,
        Math.sin(rad(i * 60 + 30)) * 50,
      ]);
      return (
        poly(hex, "url(#hull)", BLUE.pale, 1.8) +
        poly(
          hex.map(([x, y]): Pt => [x * 0.6, y * 0.6]),
          "none",
          BLUE.light,
          1.1,
        ) +
        circle([0, 0], 10, "#ffffff", 1.2, "url(#flare)") +
        sparks([0, 0], 70, f, 6, 3)
      );
    },
  ],
  build_skimmer: [
    "TIDE SKIMMER",
    (f) => {
      let out =
        poly(
          [
            [-70, 6],
            [-30, -16],
            [60, -10],
            [84, 4],
            [50, 18],
            [-40, 20],
          ],
          "url(#hull)",
          BLUE.pale,
          1.7,
        ) +
        poly(
          [
            [-10, -16],
            [10, -40],
            [26, -12],
          ],
          "url(#plate)",
          BLUE.pale,
          1.4,
        ) +
        eye([52, -2]);
      for (let i = 0; i < 3; i++)
        out += path(
          `M${-90 - i * 14} ${22 + i * 4}q10 ${wave(f, i) * 4} 20 0t20 0`,
          BLUE.light,
          1.3,
          "none",
          `opacity="${0.9 - i * 0.25}"`,
        );
      return out;
    },
  ],
  build_familiar: [
    "STAR FAMILIAR",
    (f) => {
      let out = circle([0, 0], 16, "#ffffff", 1.6, "url(#flare)");
      for (let i = 0; i < 3; i++)
        out += `<ellipse cx="0" cy="0" rx="${46 + i * 8}" ry="${14 + i * 4}" fill="none" stroke="${BLUE.pale}" stroke-width="1.2" transform="rotate(${i * 60 + f * 15})"/>`;
      return out + glow([0, 0], 70, 0.4);
    },
  ],
  build_mantis: [
    "VAULT MANTIS",
    (f) => {
      const sway = wave(f, 0) * 4;
      let out =
        path(`M-10 40Q-20 0 0 -30Q20 -50 ${30 + sway} -60`, BLUE.pale, 7, "none", 'opacity=".5"') +
        path(`M-10 40Q-20 0 0 -30Q20 -50 ${30 + sway} -60`, BLUE.light, 3);
      out +=
        poly(
          [
            [30 + sway, -70],
            [58 + sway, -58],
            [40 + sway, -46],
            [24 + sway, -56],
          ],
          "url(#hull)",
          BLUE.pale,
          1.5,
        ) + eye([44 + sway, -58], 3);
      for (const k of [-1, 1]) out += path(`M0 -10L${k * 50} ${-30 - (f % 2) * 6}L${k * 70} 10`, BLUE.pale, 2.4);
      return out + path("M-24 40H10M-4 40V70M-24 70H10", BLUE.light, 2);
    },
  ],
  build_colossus: [
    "IRON COLOSSUS",
    (f) => {
      const torso = poly(
        mirrored([
          [0, -70],
          [44, -60],
          [56, 0],
          [40, 50],
        ]),
        "url(#hull)",
        BLUE.pale,
        1.8,
      );
      return (
        torso +
        poly(
          [
            [-32, 50],
            [32, 50],
            [28, 90],
            [-28, 90],
          ],
          "url(#plate)",
          BLUE.pale,
          1.5,
        ) +
        circle([0, -76], 14, BLUE.pale, 1.6, "url(#hull)") +
        `<rect x="-8" y="-82" width="16" height="5" fill="#ffffff" opacity="${f % 2 ? 1 : 0.6}"/>` +
        poly(
          [
            [-90, -20],
            [-56, -30],
            [-56, 30],
            [-86, 36],
          ],
          "url(#plate)",
          BLUE.pale,
          1.4,
        ) +
        poly(
          [
            [90, -20],
            [56, -30],
            [56, 30],
            [86, 36],
          ],
          "url(#plate)",
          BLUE.pale,
          1.4,
        )
      );
    },
  ],
  build_hawk: [
    "RIFT HAWK",
    (f) => {
      const flap = wave(f, 0) * 22;
      let out = "";
      for (const k of [-1, 1])
        out += poly(
          [
            [0, -6],
            [k * 60, -30 + flap],
            [k * 120, -14 + flap * 1.4],
            [k * 90, 10],
            [k * 40, 16],
          ],
          "url(#hull)",
          BLUE.pale,
          1.5,
        );
      return (
        out +
        poly(
          [
            [-14, -8],
            [14, -8],
            [8, 40],
            [-8, 40],
          ],
          "url(#plate)",
          BLUE.pale,
          1.5,
        ) +
        poly(
          [
            [-8, -30],
            [8, -30],
            [0, -8],
          ],
          "url(#plate)",
          BLUE.pale,
          1.4,
        ) +
        poly(
          [
            [0, -22],
            [12, -14],
            [0, -10],
          ],
          "#ffffff",
          "#ffffff",
          1,
        ) +
        eye([-4, -22], 2) +
        poly(
          [
            [-10, 40],
            [10, 40],
            [0, 70],
          ],
          "url(#hull)",
          BLUE.light,
          1.2,
        )
      );
    },
  ],
  build_dragon: [
    "AETHER DRAGON",
    (f) => {
      const flap = wave(f, 0) * 14;
      let out =
        path(`M-80 30Q-40 -10 0 0Q50 10 90 -20`, BLUE.pale, 12, "none", 'opacity=".4"') +
        path(`M-80 30Q-40 -10 0 0Q50 10 90 -20`, "url(#crystal)", 8);
      for (const k of [0, 1])
        out += poly(
          [
            [-10 + k * 30, -4],
            [-60 + k * 30, -70 - flap],
            [-30 + k * 30, -30],
            [-14 + k * 30, -56 - flap],
            [10 + k * 30, -4],
          ],
          "url(#hull)",
          BLUE.pale,
          1.3,
        );
      return (
        out +
        poly(
          [
            [90, -20],
            [126, -34],
            [120, -8],
            [96, -6],
          ],
          "url(#hull)",
          BLUE.pale,
          1.6,
        ) +
        eye([112, -24], 3) +
        (f % 2 ? "" : path("M126 -22L170 -10M126 -18L164 6", "#ffffff", 2, "none", 'opacity=".8"')) +
        glow([150, -8], 36, 0.4)
      );
    },
  ],
};

export const PET_SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(PETS).map(([id, [label, draw]]) => [
    id,
    (f: number) => {
      const bob = wave(f, 0) * 3;
      return (
        bench() +
        glow([320, 200], 120, 0.18) +
        at(320, 190 + bob, 1.1, 0, draw(f)) +
        card("", label, [320, 190], f, 82, [430, 120])
      );
    },
  ]),
);
