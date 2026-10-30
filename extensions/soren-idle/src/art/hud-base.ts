import { BUILDING_BY_ID } from "../engine/data";
import { BuildingId } from "../engine/types";
import { BLUE, circle, line, path, poly, Pt, renderHud, text } from "./hud";
import { callout, crystal, ground, hullBody, moon } from "./hud-scenes";
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

const BASE = 304;

interface Site {
  /** Draws the building for a frame and level (a level of 0 is drawn as level 1, dimmed). */
  draw(f: number, level: number): string;
  /** Where the leader line to the status label starts. */
  tag: Pt;
}

// --- buildings ---------------------------------------------------------------------

const shelter: Site = {
  tag: [400, 230],
  draw: (f, L) => {
    let out = path(`M160 ${BASE}A140 110 0 0 1 440 ${BASE}Z`, BLUE.pale, 1.8, "url(#hull)");
    for (const rx of [100, 60])
      out += path(
        `M${300 - rx} ${BASE}A${rx} ${rx * 0.78} 0 0 1 ${300 + rx} ${BASE}`,
        BLUE.mid,
        1.2,
      );
    out += line([300, BASE], [300, BASE - 110], BLUE.mid, 1.2);
    out += rect(276, 258, 48, 46, 4);
    for (let i = 0; i < L; i++) {
      out += rect(
        200 + i * 40 + (i > 2 ? 8 : 0),
        236 - (i % 2) * 22,
        20,
        14,
        3,
        BLUE.pale,
        i === f % 5 ? BLUE.pale : BLUE.light,
      );
    }
    if (L >= 3)
      out +=
        line([300, 194], [300, 150], BLUE.pale, 2.4) +
        path("M280 150Q300 128 320 150", BLUE.pale, 2);
    if (L >= 5)
      out += `<ellipse cx="300" cy="${BASE}" rx="${170 + (f % 2) * 4}" ry="136" fill="none" stroke="${BLUE.light}" stroke-width="1.4" stroke-dasharray="10 8" stroke-dashoffset="${f * 6}"/>`;
    return out;
  },
};

const generator: Site = {
  tag: [420, 240],
  draw: (f, L) => {
    let out = "";
    const w = 60;
    const x0 = 300 - (L * w) / 2;
    for (let i = 0; i < L; i++) {
      const x = x0 + i * w;
      out += hull([
        [x + 6, 250],
        [x + w + 2, 244],
        [x + w - 6, 290],
        [x - 2, 296],
      ]);
      out += path(
        `M${x + 2} 273L${x + w} 267M${x + 20} 248L${x + 12} 294M${x + 38} 246L${x + 30} 292`,
        BLUE.mid,
        1,
      );
      out += line([x + w / 2, 292], [x + w / 2, BASE], BLUE.pale, 2);
    }
    const sun: Pt = [150, 130];
    out += circle(sun, 22, BLUE.pale, 1.6, BLUE.light, 'fill-opacity=".5"');
    for (let i = 0; i < 12; i++) {
      const a = rad(i * 30 + f * 7);
      out += line(
        [sun[0] + Math.cos(a) * 30, sun[1] + Math.sin(a) * 30],
        [sun[0] + Math.cos(a) * (42 + (i % 2) * 8), sun[1] + Math.sin(a) * (42 + (i % 2) * 8)],
        BLUE.pale,
        1.6,
      );
    }
    for (let i = 0; i < 5; i++)
      out += rect(
        480 + i * 14,
        290 - (i < L ? 14 + i * 10 : 6),
        9,
        i < L ? 14 + i * 10 : 6,
        1,
        BLUE.pale,
        i < L ? BLUE.light : "none",
      );
    return out;
  },
};

const workshop: Site = {
  tag: [400, 220],
  draw: (f, L) => {
    let out = hull([
      [180, 238],
      [300, 180],
      [420, 238],
    ]);
    out += rect(190, 238, 220, 66, 3);
    out += rect(262, 252, 76, 52, 3, BLUE.pale, "#0b1e44");
    for (let i = 0; i < 4; i++) out += line([262, 264 + i * 11], [338, 264 + i * 11], BLUE.mid, 1);
    for (let i = 0; i < Math.min(L, 5); i++)
      out += rect(200 + (i % 2) * 130 + Math.floor(i / 2) * 22, 248, 16, 14, 2, BLUE.light);
    const a = rad(f * 20);
    let gear = "";
    for (let i = 0; i < 16; i++) {
      const g = a + (i * Math.PI) / 8;
      const r = i % 2 ? 14 : 19;
      gear += `${i ? "L" : "M"}${(300 + Math.cos(g) * r).toFixed(1)} ${(212 + Math.sin(g) * r).toFixed(1)}`;
    }
    out +=
      path(`${gear}Z`, BLUE.pale, 1.4, "url(#hull)") +
      circle([300, 212], 5, BLUE.pale, 1.2, BLUE.bg);
    out += line([420, BASE], [420, 170], BLUE.pale, 3) + line([420, 170], [470, 190], BLUE.pale, 3);
    const sway = Math.sin(rad(f * 90)) * 6;
    out +=
      line([470, 190], [470 + sway, 232], BLUE.light, 1.4) +
      path(`M${462 + sway} 232h16v8h-16z`, BLUE.pale, 1.4);
    out += `<circle cx="300" cy="${BASE - 10}" r="${(10 + f * 2).toFixed(1)}" fill="url(#flare)" opacity=".7"/>`;
    return out;
  },
};

function droneBody(c: Pt, s: number, f: number): string {
  let out = `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${24 * s}" ry="${11 * s}" fill="url(#hull)" stroke="${BLUE.pale}" stroke-width="1.6"/>`;
  out += circle(
    [c[0], c[1] - 2 * s],
    4 * s,
    "#ffffff",
    1,
    "#ffffff",
    `opacity="${f % 2 ? 1 : 0.6}"`,
  );
  for (const dx of [-34, 34]) {
    out += line([c[0] + dx * 0.55 * s, c[1] - 4 * s], [c[0] + dx * s, c[1] - 12 * s], BLUE.pale, 2);
    out += `<ellipse cx="${c[0] + dx * s}" cy="${c[1] - 13 * s}" rx="${(f % 2 ? 22 : 15) * s}" ry="${2.4 * s}" fill="${BLUE.light}" fill-opacity=".5" stroke="${BLUE.pale}" stroke-width="1"/>`;
  }
  out +=
    line([c[0] - 8 * s, c[1] + 10 * s], [c[0] - 12 * s, c[1] + 26 * s], BLUE.pale, 2) +
    line([c[0] + 8 * s, c[1] + 10 * s], [c[0] + 12 * s, c[1] + 26 * s], BLUE.pale, 2);
  return out;
}

function fleet(kind: "scrap" | "ore" | "glowcap", f: number, L: number): string {
  let out = "";
  const n = Math.min(Math.max(L, 1), 5);
  for (let k = 0; k < 7; k++) {
    const x = 170 + k * 44;
    if (kind === "scrap")
      out += hull(
        [
          [x, BASE],
          [x + 12, BASE - 18 - (k % 3) * 6],
          [x + 28, BASE - 4],
          [x + 22, BASE],
        ],
        BLUE.light,
        1.2,
      );
    else if (kind === "ore") out += crystal(x + 10, BASE, 20 + (k % 3) * 8, 6, (k % 3) * 8 - 8);
    else
      out += path(
        `M${x} ${BASE}q10 -${24 + (k % 3) * 8} 20 0z`,
        BLUE.pale,
        1.3,
        "url(#crystal)",
        'fill-opacity=".7"',
      );
  }
  const spots: Pt[] = [
    [300, 170],
    [210, 200],
    [390, 200],
    [150, 160],
    [450, 160],
  ];
  for (let i = 0; i < n; i++) {
    const bob = Math.sin(rad(f * 90 + i * 70)) * 4;
    const s = i === 0 ? 1.4 : 1;
    const c: Pt = [spots[i][0], spots[i][1] + bob];
    out += droneBody(c, s, f + i);
    const beam = c[1] + 28 * s;
    out += line(
      [c[0], beam],
      [c[0], BASE - 22],
      BLUE.light,
      1,
      'stroke-dasharray="3 5" opacity=".6"',
    );
  }
  return out;
}

const salvageDrone: Site = { tag: [330, 190], draw: (f, L) => fleet("scrap", f, L) };
const miningDrone: Site = { tag: [330, 190], draw: (f, L) => fleet("ore", f, L) };
const foragerDrone: Site = { tag: [330, 190], draw: (f, L) => fleet("glowcap", f, L) };

const translator: Site = {
  tag: [420, 210],
  draw: (f, L) => {
    let out = rect(200, 176, 200, 128, 8);
    out += rect(214, 190, 172, 100, 4, BLUE.light, "#0b1e44");
    for (let i = 0; i < L; i++) {
      const x = 226 + i * 32;
      for (let j = 0; j < 4; j++) {
        const g = hash(i * 7 + j, f % 2, 121);
        out +=
          g > 0.5
            ? rect(x, 200 + j * 20, 18, 12, 2, BLUE.pale, "none")
            : poly(
                [
                  [x, 212 + j * 20],
                  [x + 9, 200 + j * 20],
                  [x + 18, 212 + j * 20],
                ],
                "none",
                BLUE.pale,
                1.2,
              );
      }
    }
    let wave = "M214 270";
    for (let x = 0; x <= 172; x += 6)
      wave += `L${214 + x} ${(270 + Math.sin(rad(x * 4 + f * 90)) * 8 * (L / 5 + 0.4)).toFixed(1)}`;
    out += path(wave, "#ffffff", 1.4);
    out +=
      line([300, 176], [300, 140], BLUE.pale, 3) +
      path("M262 130Q300 96 338 130Z", BLUE.pale, 1.8, "url(#hull)");
    for (let i = 0; i < 3; i++)
      out += path(
        `M${318 + i * 10} ${118 - i * 6}a${14 + i * 8} ${14 + i * 8} 0 0 1 0 ${-(10 + i * 8)}`,
        BLUE.light,
        1.4,
        "none",
        `opacity="${(0.9 - i * 0.25 + (f % 2) * 0.1).toFixed(2)}"`,
      );
    return out;
  },
};

const hub: Site = {
  tag: [420, 230],
  draw: (f, L) => {
    let out = rect(190, 250, 220, 54, 3);
    for (let i = 0; i < 6; i++) {
      out += hull(
        [
          [190 + i * 37, 210],
          [227 + i * 37, 210],
          [221 + i * 37, 236],
          [196 + i * 37, 236],
        ],
        BLUE.pale,
        1.3,
      );
    }
    out += path("M184 210H416L404 190H196Z", BLUE.pale, 1.6, "url(#hull)");
    out += rect(224, 258, 152, 14, 2);
    for (let i = 0; i < L; i++) out += crystal(236 + i * 28, 258, 16 + (i % 2) * 8, 5, 0);
    for (let i = 0; i < 3; i++) {
      const t = ((f + i * 1.3) % 4) / 4;
      out += circle(
        [430 + i * 14, 240 - t * 70],
        6,
        BLUE.pale,
        1.4,
        BLUE.light,
        `fill-opacity=".5" opacity="${(1 - t).toFixed(2)}"`,
      );
    }
    out +=
      rect(250, 150, 100, 26, 3) + text(262, 168, 12, "MARKET", BLUE.pale, 'letter-spacing="1"');
    return out;
  },
};

const hydroponicBay: Site = {
  tag: [430, 220],
  draw: (f, L) => {
    let out =
      rect(180, 130, 240, 14, 4) +
      `<rect x="190" y="136" width="220" height="5" rx="2" fill="${BLUE.pale}" opacity="${[0.8, 1, 0.9, 1][f]}"/>`;
    out += `<polygon points="196,144 404,144 430,272 170,272" fill="${BLUE.light}" opacity=".08"/>`;
    for (let i = 0; i < Math.min(L, 4); i++) {
      const x = 180 + i * 60;
      const h = 16 + ((i * 3 + f) % 4) * 4 + i * 10;
      out += line([x + 26, 264], [x + 26, 264 - h], BLUE.pale, 1.6);
      out +=
        path(
          `M${x + 26} ${264 - h * 0.6}q-16 -8 -20 -18q16 0 20 18z`,
          BLUE.pale,
          1.1,
          "url(#hull)",
        ) +
        path(
          `M${x + 26} ${264 - h * 0.8}q16 -8 20 -18q-16 0 -20 18z`,
          BLUE.pale,
          1.1,
          "url(#hull)",
        );
      out += hull([
        [x, 264],
        [x + 52, 264],
        [x + 44, 290],
        [x + 8, 290],
      ]);
      out +=
        line([x + 18, 290], [x + 18, BASE], BLUE.light, 1.2) +
        line([x + 34, 290], [x + 34, BASE], BLUE.light, 1.2);
    }
    out += rect(170, BASE - 4, 260, 10, 3);
    return out;
  },
};

const storage: Site = {
  tag: [440, 230],
  draw: (f, L) => {
    let out = "";
    const rows = Math.min(L, 5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        const x = 210 + c * 66 + (r % 2 ? 12 : 0);
        const y = BASE - 36 - r * 36;
        out += rect(x, y, 60, 32, 2);
        out += path(
          `M${x + 4} ${y + 4}L${x + 56} ${y + 28}M${x + 56} ${y + 4}L${x + 4} ${y + 28}`,
          BLUE.mid,
          1,
        );
        out += circle(
          [x + 8, y + 8],
          2,
          "#ffffff",
          1,
          "#ffffff",
          `opacity="${(r + c + f) % 2 ? 1 : 0.4}"`,
        );
      }
    }
    out += rect(190, BASE, 240, 8, 2);
    return out;
  },
};

const stasisPod: Site = {
  tag: [410, 232],
  draw: (f, L) => {
    let out = rect(170, 252, 260, 50, 14);
    out += path(
      "M190 252Q190 196 250 192H350Q410 196 410 252",
      BLUE.pale,
      1.8,
      "url(#plate)",
      'fill-opacity=".35"',
    );
    out += `<ellipse cx="300" cy="${230 + (f % 2)}" rx="${70 + (f % 2) * 2}" ry="16" fill="${BLUE.light}" fill-opacity=".3"/>`;
    out +=
      circle([250, 232], 11, BLUE.pale, 1.4, BLUE.light) +
      path("M262 236H350Q366 236 366 248H262Z", BLUE.pale, 1.4, "url(#hull)");
    for (let i = 0; i < Math.min(L, 5); i++) {
      out +=
        line([196 + i * 52, 252], [196 + i * 52, 290], BLUE.mid, 1) +
        circle([196 + i * 52, 296], 3, BLUE.pale, 1, BLUE.pale);
    }
    out += rect(440, 214, 54, 40, 3, BLUE.light, "#0b1e44");
    let beat = "M446 236";
    for (let x = 0; x < 44; x += 4) beat += `L${446 + x} ${x % 16 === 8 ? 222 + (f % 2) * 2 : 236}`;
    out += path(beat, "#ffffff", 1.4);
    for (let i = 0; i < 6; i++)
      out += line(
        [210 + i * 28, 206 - (i % 2) * 6],
        [214 + i * 28, 198 - (i % 2) * 6],
        BLUE.pale,
        1.2,
        'opacity=".7"',
      );
    return out;
  },
};

const bountyBoard: Site = {
  tag: [400, 220],
  draw: (f, L) => {
    let out =
      line([220, BASE], [220, 160], BLUE.pale, 4) + line([380, BASE], [380, 160], BLUE.pale, 4);
    out += rect(196, 152, 208, 120, 5);
    out += rect(206, 162, 188, 100, 3, BLUE.light, "#0b1e44");
    const cards = Math.min(L, 3) * 2;
    for (let i = 0; i < cards; i++) {
      const x = 216 + (i % 3) * 60;
      const y = 172 + Math.floor(i / 3) * 44 + (i % 2);
      out += rect(x, y, 48, 36, 2, BLUE.pale, i === 0 ? BLUE.light : "none");
      out += circle([x + 24, y + 2], 2.4, "#ffffff", 1, "#ffffff");
      out += path(`M${x + 8} ${y + 14}h32M${x + 8} ${y + 22}h24`, BLUE.mid, 1.2);
    }
    out +=
      `<circle cx="300" cy="140" r="${(8 + f).toFixed(1)}" fill="url(#flare)"/>` +
      line([300, 146], [300, 152], BLUE.pale, 2);
    return out;
  },
};

const beacon: Site = {
  tag: [340, 150],
  draw: (f) => {
    let out = hull(
      [
        [270, BASE],
        [300, 84],
        [330, BASE],
      ],
      BLUE.pale,
      1.8,
    );
    for (let i = 1; i < 7; i++) {
      const y = 84 + i * 31;
      const half = 3 + i * 4.2;
      out +=
        line([300 - half, y], [300 + half, y], BLUE.mid, 1.2) +
        line([300 - half, y], [300 + half * 0.4, y - 31], BLUE.mid, 1) +
        line([300 + half, y], [300 - half * 0.4, y - 31], BLUE.mid, 1);
    }
    out += rect(250, BASE, 100, 10, 3);
    out +=
      `<circle cx="300" cy="80" r="${(14 + f * 3).toFixed(1)}" fill="url(#flare)"/>` +
      circle([300, 80], 6, "#ffffff", 1.4, "#ffffff");
    for (let i = 0; i < 4; i++) {
      const r = 20 + ((f + i) % 4) * 26;
      out += `<circle cx="300" cy="80" r="${r}" fill="none" stroke="${BLUE.pale}" stroke-width="1.4" opacity="${(0.9 - ((f + i) % 4) * 0.22).toFixed(2)}"/>`;
    }
    return out;
  },
};

const SITES: Record<BuildingId, Site> = {
  shelter,
  generator,
  workshop,
  salvage_drone: salvageDrone,
  mining_drone: miningDrone,
  forager_drone: foragerDrone,
  translator,
  hub,
  hydroponic_bay: hydroponicBay,
  storage,
  stasis_pod: stasisPod,
  bounty_board: bountyBoard,
  beacon,
};

export const BUILDING_ART_IDS = Object.keys(SITES) as BuildingId[];

function building(id: BuildingId, level: number): (f: number) => string {
  const def = BUILDING_BY_ID[id];
  const site = SITES[id];
  const label = level > 0 ? `LEVEL ${level}/${def.maxLevel}` : "NOT BUILT";
  return (f) => {
    const subject = site.draw(f, Math.max(1, level));
    const pips = Array.from({ length: def.maxLevel }, (_, i) =>
      rect(
        320 - (def.maxLevel * 12) / 2 + i * 12,
        350,
        8,
        8,
        1,
        BLUE.mid,
        i < level ? BLUE.light : "none",
      ),
    ).join("");
    return [
      moon(f),
      ground(),
      level > 0 ? subject : `<g opacity=".35">${subject}</g>`,
      callout(site.tag, [452, 150], label),
      pips,
    ].join("");
  };
}

export function buildingSvg(id: BuildingId, level: number, frame = 2): string {
  return renderHud(building(id, level), frame, 131 + BUILDING_ART_IDS.indexOf(id) * 2);
}

// --- the idle camp -----------------------------------------------------------------

export function camp(f: number): string {
  const fire: Pt = [430, 296];
  let flames = "";
  for (const [k, h] of [
    [1, 56],
    [0.62, 36],
  ] as const) {
    const grow = [0, 7, 3, 9][f] * k;
    flames += path(
      `M${fire[0] - 22 * k} ${fire[1]}Q${fire[0] - 26 * k} ${fire[1] - h * 0.5} ${fire[0]} ${fire[1] - h - grow}Q${fire[0] + 26 * k} ${fire[1] - h * 0.5} ${fire[0] + 22 * k} ${fire[1]}Z`,
      BLUE.pale,
      1.4,
      k === 1 ? "none" : BLUE.light,
      k === 1 ? "" : 'fill-opacity=".6"',
    );
  }
  let embers = "";
  for (let i = 0; i < 9; i++) {
    const t = ((f + hash(i, 1, 141) * 4) % 4) / 4;
    embers += circle(
      [
        fire[0] + (hash(i, 2, 141) - 0.5) * 50 + Math.sin(rad(t * 360 + i * 50)) * 6,
        fire[1] - 40 - t * 90,
      ],
      1.4,
      "#ffffff",
      1,
      "#ffffff",
      `opacity="${(1 - t).toFixed(2)}"`,
    );
  }
  return [
    moon(f),
    ground(),
    `<g opacity=".85" transform="translate(54 150) rotate(20) scale(.78)">${hullBody()}</g>`,
    `<circle cx="${fire[0]}" cy="${fire[1] - 20}" r="${(70 + f * 4).toFixed(1)}" fill="url(#flare)" opacity=".35"/>`,
    line([fire[0] - 36, fire[1] + 6], [fire[0] + 30, fire[1] - 8], BLUE.pale, 4),
    line([fire[0] + 36, fire[1] + 6], [fire[0] - 30, fire[1] - 8], BLUE.pale, 4),
    flames,
    embers,
    callout([fire[0] + 20, fire[1] - 30], [470, 150], "STANDBY"),
  ].join("");
}
