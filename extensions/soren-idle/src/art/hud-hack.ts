import { BLUE, circle, line, path, poly, Pt, text } from "./hud";
import { card, glow, mirrored, rad, Scene, sparks, wave } from "./hud-kit";
import { hash } from "./util";

const C: Pt = [320, 204];
const bits = (x: number, f: number, seed: number, rows = 9) =>
  Array.from({ length: rows }, (_, r) => {
    let s = "";
    for (let k = 0; k < 8; k++) s += hash(r * 7 + k, f, seed) > 0.5 ? "1" : "0";
    return text(x, 92 + r * 13, 9, s, BLUE.mid, `opacity="${r === f * 2 ? 1 : 0.5}"`);
  }).join("");

const ring = (c: Pt, r: number, f: number, dir: number, dash = "10 7") =>
  circle(c, r, BLUE.light, 1.5, "none", `stroke-dasharray="${dash}" stroke-dashoffset="${dir * f * 9}"`);

const box = (x: number, y: number, w: number, h: number, fill = "url(#hull)") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${BLUE.pale}" stroke-width="1.5"/>`;

const HACK: Record<string, [string, Scene]> = {
  hack_cache: [
    "RELIC CACHE",
    (f) => {
      const lock =
        circle([320, 230], 14, BLUE.pale, 1.6, f % 2 ? "#ffffff" : BLUE.bg) +
        path("M310 216V204Q320 190 330 204V216", BLUE.pale, 2);
      return (
        box(220, 190, 200, 110) +
        path("M220 220H420", BLUE.light, 1.4) +
        lock +
        poly(
          [
            [220, 190],
            [420, 190],
            [400, 160],
            [240, 160],
          ],
          "url(#plate)",
          BLUE.pale,
          1.5,
        ) +
        bits(96, f, 3) +
        sparks([320, 230], 36, f, 5, 2)
      );
    },
  ],
  hack_door: [
    "VAULT DOOR",
    (f) => {
      let out = "";
      for (let i = 0; i < 4; i++) out += ring(C, 30 + i * 22, f, i % 2 ? -1 : 1, `${10 + i * 5} ${7 + i * 3}`);
      for (let i = 0; i < 8; i++) {
        const a = rad(i * 45);
        out += circle(
          [C[0] + Math.cos(a) * 130, C[1] + Math.sin(a) * 130],
          4,
          BLUE.pale,
          1.2,
          (i + f * 2) % 8 < 2 ? "#ffffff" : BLUE.bg,
        );
      }
      return out + circle(C, 18, BLUE.pale, 1.6, "url(#flare)") + bits(96, f, 4);
    },
  ],
  hack_archive: [
    "ARCHIVE TERMINAL",
    (f) => {
      let out = "";
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 8; c++)
          out += box(150 + c * 46, 110 + r * 42, 38, 32, c === (f * 2 + r) % 8 ? "url(#plate)" : "none");
      return out + line([150, 110 + f * 40], [510, 110 + f * 40], "#ffffff", 1.6) + bits(96, f, 5, 4);
    },
  ],
  hack_warden: [
    "WARDEN CORE",
    (f) => {
      const head = poly(
        mirrored([
          [0, -80],
          [60, -60],
          [74, 0],
          [50, 70],
          [0, 84],
        ]).map(([x, y]): Pt => [x + 320, y + 204]),
        "url(#hull)",
        BLUE.pale,
        1.8,
      );
      const eye = circle([320, 190], 24 + (f % 2) * 3, "#ffffff", 1.8, "url(#flare)");
      let wires = "";
      for (let i = 0; i < 5; i++)
        wires += path(
          `M${230 + i * 45} 300Q${230 + i * 45 + wave(f, i) * 12} 340 ${200 + i * 60} 380`,
          BLUE.light,
          1.4,
        );
      return head + eye + glow([320, 190], 100, 0.35) + wires + path("M290 250H350", BLUE.mid, 3);
    },
  ],
  hack_heart: [
    "HEART VAULT",
    (f) => {
      let out = "";
      for (let i = 0; i < 24; i++) {
        const a = rad(i * 15);
        out += circle(
          [C[0] + Math.cos(a) * 150, C[1] + Math.sin(a) * 150],
          3.4,
          BLUE.pale,
          1,
          (i + f) % 3 ? BLUE.bg : "#ffffff",
        );
      }
      for (let i = 0; i < 3; i++) out += ring(C, 40 + i * 30, f, i % 2 ? 1 : -1);
      const heart = path(
        `M${C[0]} ${C[1] + 26}C${C[0] - 50} ${C[1] - 6} ${C[0] - 26} ${C[1] - 40} ${C[0]} ${C[1] - 18}C${C[0] + 26} ${C[1] - 40} ${C[0] + 50} ${C[1] - 6} ${C[0]} ${C[1] + 26}Z`,
        "#ffffff",
        1.8,
        "url(#flare)",
      );
      return out + heart + glow(C, 80 + (f % 2) * 10, 0.5);
    },
  ],
  hack_signal: [
    "SIGNAL LOCKER",
    (f) => {
      let out =
        line([320, 120], [320, 300], BLUE.pale, 4) +
        line([320, 150], [270, 300], BLUE.light, 2) +
        line([320, 150], [370, 300], BLUE.light, 2) +
        circle([320, 116], 6, "#ffffff", 1.4, "#ffffff");
      for (let i = 0; i < 4; i++)
        out += path(
          `M${300 - i * 22} ${116 - i * 8}Q${290 - i * 22} 116 ${300 - i * 22} ${124 + i * 8}M${340 + i * 22} ${116 - i * 8}Q${350 + i * 22} 116 ${340 + i * 22} ${124 + i * 8}`,
          BLUE.light,
          1.4,
          "none",
          `opacity="${(f + i) % 4 === 0 ? 1 : 0.35}"`,
        );
      return out + box(420, 220, 90, 80) + circle([465, 260], 10, BLUE.pale, 1.4, "none") + bits(96, f, 6, 6);
    },
  ],
  hack_cipher: [
    "CIPHER ENGINE",
    (f) => {
      const gear = (c: Pt, r: number, deg: number) => {
        let g = "";
        for (let i = 0; i < 10; i++) {
          const a = rad(i * 36 + deg);
          g += line(
            [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r],
            [c[0] + Math.cos(a) * (r + 10), c[1] + Math.sin(a) * (r + 10)],
            BLUE.pale,
            5,
          );
        }
        return circle(c, r, BLUE.pale, 1.6, "url(#hull)") + g + circle(c, r * 0.3, BLUE.pale, 1.2, BLUE.bg);
      };
      return (
        gear([270, 200], 50, f * 9) +
        gear([362, 236], 36, -f * 12 + 18) +
        gear([380, 150], 26, f * 14) +
        box(190, 290, 260, 18) +
        [0, 1, 2, 3, 4]
          .map((i) => line([220 + i * 48, 290], [220 + i * 48, 270 - hash(i, f) * 16], BLUE.pale, 4))
          .join("")
      );
    },
  ],
  hack_sentinel: [
    "SENTINEL MIND",
    (f) => {
      const frame = box(250, 100, 140, 200);
      const eye =
        `<ellipse cx="320" cy="190" rx="44" ry="${16 + (f % 3) * 3}" fill="url(#flare)" stroke="${BLUE.pale}" stroke-width="1.8"/>` +
        circle([320, 190], 8, BLUE.bg, 1.4, BLUE.bg);
      let bars = "";
      for (let i = 0; i < 6; i++) bars += line([262, 120 + i * 30], [378, 120 + i * 30], BLUE.mid, 1, 'opacity=".5"');
      return frame + bars + eye + glow([320, 190], 100, 0.3) + line([320, 300], [320, 330], BLUE.pale, 4);
    },
  ],
  hack_oracle: [
    "ORACLE TERMINAL",
    (f) => {
      let out =
        poly(
          [
            [290, 300],
            [350, 300],
            [338, 130],
            [302, 130],
          ],
          "url(#hull)",
          BLUE.pale,
          1.6,
        ) +
        circle([320, 112], 30, BLUE.pale, 1.8, "url(#flare)") +
        circle([320, 112], 10 + (f % 2) * 3, "#ffffff", 1.4, "#ffffff");
      for (let i = 0; i < 3; i++)
        out += circle([320, 112], 46 + i * 22 + (f % 2) * 4, BLUE.light, 1, "none", `opacity="${0.7 - i * 0.2}"`);
      return out + greebleRow(f);
    },
  ],
  hack_gate: [
    "GATE NETWORK",
    (f) => {
      const nodes: Pt[] = [
        [200, 130],
        [320, 100],
        [440, 140],
        [250, 240],
        [390, 250],
        [320, 180],
        [170, 290],
        [480, 280],
      ];
      const links = [
        [0, 1],
        [1, 2],
        [0, 5],
        [1, 5],
        [2, 5],
        [5, 3],
        [5, 4],
        [3, 6],
        [4, 7],
        [2, 4],
        [0, 3],
      ];
      let out = links.map(([a, b]) => line(nodes[a], nodes[b], BLUE.light, 1.2, 'opacity=".7"')).join("");
      out += nodes
        .map((p, i) => circle(p, i === 5 ? 14 : 8, BLUE.pale, 1.4, i === (f * 2) % 8 || i === 5 ? "#ffffff" : BLUE.bg))
        .join("");
      return out + glow(nodes[5], 80, 0.4);
    },
  ],
  hack_prime: [
    "PRIME AUTHORITY",
    (f) => {
      const tri = poly(
        [
          [320, 90],
          [470, 300],
          [170, 300],
        ],
        "url(#hull)",
        BLUE.pale,
        1.8,
      );
      const crown = poly(
        [
          [290, 150],
          [300, 128],
          [310, 146],
          [320, 122],
          [330, 146],
          [340, 128],
          [350, 150],
        ],
        "url(#plate)",
        "#ffffff",
        1.4,
      );
      return (
        tri +
        path("M240 240H400M270 190H370", BLUE.mid, 1) +
        crown +
        circle([320, 210], 18, "#ffffff", 1.6, "url(#flare)") +
        glow([320, 190], 130 + (f % 2) * 8, 0.35) +
        ring(C, 150, f, 1, "4 9")
      );
    },
  ],
};

function greebleRow(f: number): string {
  return bitsRow(f);
}
const bitsRow = (f: number) =>
  [0, 1, 2].map((i) => line([420, 150 + i * 14], [420 + 30 + hash(i, f) * 50, 150 + i * 14], BLUE.mid, 2)).join("");

export const HACK_SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(HACK).map(([id, [label, draw]]) => [
    id,
    (f: number) => card(draw(f), label, id === "hack_heart" || id === "hack_door" ? C : [320, 214], f, 66, [430, 330]),
  ]),
);
