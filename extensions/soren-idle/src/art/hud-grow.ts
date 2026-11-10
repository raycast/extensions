import { arm, callout, crystal, ground, moon } from "./hud-scenes";
import { BLUE, circle, line, P, path, poly, Pt, reticle, text } from "./hud";
import { hash } from "./util";

const rad = (deg: number) => (deg * Math.PI) / 180;

/** A glowcap: a domed, gilled cap on a stem, with a halo and glowing spots. */
export function mushroom(cx: number, by: number, w: number, h: number, f: number, halo = true): string {
  const capY = by - h * 0.5;
  let out = "";
  if (halo)
    out += `<circle cx="${cx}" cy="${(capY - h * 0.15).toFixed(1)}" r="${(w * 1.7).toFixed(1)}" fill="url(#flare)" opacity=".28"/>`;
  out += poly(
    [
      [cx - w * 0.2, capY],
      [cx - w * 0.3, by],
      [cx + w * 0.3, by],
      [cx + w * 0.2, capY],
    ],
    "url(#hull)",
    BLUE.light,
    1.1,
  );
  out += path(
    `M${P([cx - w, capY])}Q${P([cx - w * 1.05, by - h])} ${P([cx, by - h])}Q${P([cx + w * 1.05, by - h])} ${P([cx + w, capY])}Q${P([cx, capY - h * 0.12])} ${P([cx - w, capY])}Z`,
    BLUE.pale,
    1.3,
    "url(#crystal)",
    'fill-opacity=".85"',
  );
  for (let i = -2; i <= 2; i++) {
    out += line(
      [cx + i * w * 0.3, capY - h * 0.04],
      [cx + i * w * 0.18, capY + h * 0.1],
      BLUE.deep,
      0.8,
      'opacity=".7"',
    );
  }
  for (let i = 0; i < 3; i++) {
    const a: Pt = [cx + (hash(i, Math.round(w), 61) - 0.5) * w * 1.1, by - h * (0.68 + hash(i, 2, 61) * 0.2)];
    out += circle(
      a,
      Math.max(1.4, w * 0.08),
      "#ffffff",
      0.8,
      "#ffffff",
      `opacity="${(0.6 + 0.4 * ((f + i) % 2)).toFixed(2)}"`,
    );
  }
  return out;
}

/** A leaf: a pointed oval from a base, bending toward a tip. */
export function leaf(base: Pt, tip: Pt, width: number): string {
  const mid: Pt = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2];
  const nx = -(tip[1] - base[1]);
  const ny = tip[0] - base[0];
  const len = Math.hypot(nx, ny) || 1;
  const a: Pt = [mid[0] + (nx / len) * width, mid[1] + (ny / len) * width];
  const b: Pt = [mid[0] - (nx / len) * width, mid[1] - (ny / len) * width];
  return [
    path(`M${P(base)}Q${P(a)} ${P(tip)}Q${P(b)} ${P(base)}Z`, BLUE.pale, 1.1, "url(#hull)"),
    line(base, tip, BLUE.light, 0.8, 'opacity=".8"'),
  ].join("");
}

// --- gather glowcap ----------------------------------------------------------------

export function glowcap(f: number): string {
  const target = { x: 300, y: 318, w: 50, h: 118 };
  const tip: Pt = [target.x + 6, target.y - 10];
  let patch = "";
  const others: [number, number, number, number][] = [
    [140, 314, 30, 70],
    [196, 322, 22, 52],
    [236, 308, 18, 40],
    [388, 312, 30, 78],
    [444, 322, 22, 50],
    [492, 310, 26, 64],
    [96, 304, 16, 34],
    [352, 300, 14, 28],
  ];
  others.forEach(([x, y, w, h], i) => {
    patch += mushroom(x, y, w, h, f + i);
  });
  let spores = "";
  for (let i = 0; i < 18; i++) {
    const phase = ((f + hash(i, 1, 62) * 4) % 4) / 4;
    const x = 120 + hash(i, 2, 62) * 400 + Math.sin(rad(phase * 360 + i * 40)) * 8;
    const y = 300 - hash(i, 3, 62) * 80 - phase * 90;
    spores += circle(
      [x, y],
      1 + hash(i, 4, 62) * 1.6,
      BLUE.pale,
      0.8,
      BLUE.pale,
      `opacity="${(0.8 - phase * 0.6).toFixed(2)}"`,
    );
  }
  // the cut: a flash at the stem and a few shavings falling away
  let cut = `<circle cx="${tip[0]}" cy="${tip[1]}" r="${12 + f * 2}" fill="url(#flare)"/>`;
  for (let i = 0; i < 6; i++) {
    const phase = ((f + i * 0.7) % 4) / 4;
    cut += line(
      [tip[0] + i * 3 - 6, tip[1] + phase * 26],
      [tip[0] + i * 3 - 6 + 4, tip[1] + phase * 26 + 5],
      BLUE.pale,
      1.4,
      `opacity="${(1 - phase).toFixed(2)}"`,
    );
  }
  const bars = [0.8, 0.55, 0.9].map((v, i) => {
    const y = 192 + i * 12;
    return [
      `<rect x="470" y="${y}" width="86" height="6" fill="none" stroke="${BLUE.mid}" stroke-width=".8"/>`,
      `<rect x="470" y="${y}" width="${(86 * v * (0.94 + 0.06 * (f % 2))).toFixed(1)}" height="6" fill="${BLUE.light}" opacity=".85"/>`,
    ].join("");
  });
  return [
    moon(f),
    ground(),
    patch,
    mushroom(target.x, target.y, target.w, target.h, f),
    arm(tip, true),
    cut,
    spores,
    reticle([target.x, target.y - target.h * 0.78], 46 + (f % 2) * 2, f),
    callout([target.x + target.w, target.y - target.h * 0.6], [452, 142], "EDIBLE"),
    ...bars,
    path("M446 188v42h118", BLUE.mid, 0.9, "none", 'opacity=".6"'),
  ].join("");
}

// --- dig sweetroot -----------------------------------------------------------------

function root(cx: number, top: number, w: number, h: number, id: number): string {
  const bulb = `M${cx - w * 0.5} ${top}C${cx - w * 0.7} ${top + h * 0.35} ${cx - w * 0.4} ${top + h * 0.8} ${cx} ${top + h}C${cx + w * 0.4} ${top + h * 0.8} ${cx + w * 0.7} ${top + h * 0.35} ${cx + w * 0.5} ${top}Z`;
  let out = path(bulb, BLUE.pale, 1.4, "url(#crystal)", 'fill-opacity=".7"');
  for (let i = 1; i < 5; i++) {
    const y = top + (h * i) / 5.5;
    const half = w * (0.5 - i * 0.07);
    out += path(`M${cx - half} ${y}Q${cx} ${y + 5} ${cx + half} ${y}`, BLUE.deep, 0.9, "none", 'opacity=".7"');
  }
  for (let i = 0; i < 9; i++) {
    const y = top + h * (0.2 + hash(id, i, 71) * 0.7);
    const side = i % 2 ? 1 : -1;
    const x0 = cx + side * w * (0.4 - ((y - top) / h) * 0.3);
    out += path(
      `M${x0} ${y}q${side * (8 + hash(i, id, 72) * 14)} ${hash(i, id, 73) * 10 - 2} ${side * (14 + hash(i, id, 74) * 16)} ${6 + hash(i, id, 75) * 12}`,
      BLUE.light,
      0.9,
      "none",
      'opacity=".75"',
    );
  }
  return out;
}

export function sweetroot(f: number): string {
  const surface = 206;
  const crown: Pt = [320, surface];
  let fronds = "";
  [-62, -36, -12, 14, 40, 64].forEach((dx, i) => {
    const h = 70 + (i % 3) * 18;
    const sway = Math.sin(rad(f * 90 + i * 60)) * 5;
    fronds += leaf(crown, [crown[0] + dx * 1.2 + sway, surface - h], 11);
  });
  let strata = "";
  for (let k = 0; k < 8; k++) {
    let d = "";
    for (let x = 100; x <= 540; x += 22) {
      d += `${d ? "L" : "M"}${x} ${(surface + 14 + k * 17 + Math.sin(x * 0.05 + k) * 3 + hash(x, k, 76) * 2).toFixed(1)}`;
    }
    strata += path(d, BLUE.light, 0.9, "none", `opacity="${(0.3 + (k % 3) * 0.12).toFixed(2)}"`);
  }
  const dig: Pt = [270, [238, 248, 258, 248][f]];
  const spade = poly(
    [
      [dig[0] - 11, dig[1] - 16],
      [dig[0] + 11, dig[1] - 16],
      [dig[0] + 9, dig[1] + 10],
      [dig[0], dig[1] + 18],
      [dig[0] - 9, dig[1] + 10],
    ],
    BLUE.deep,
    BLUE.pale,
    1.6,
  );
  let soil = "";
  for (let i = 0; i < 14; i++) {
    const phase = ((f + hash(i, 1, 77) * 4) % 4) / 4;
    const vx = (hash(i, 2, 77) - 0.5) * 90;
    const p: Pt = [dig[0] + vx * phase, surface - 4 - 52 * phase + 120 * phase * phase * 0.5];
    soil += circle(p, 1.2 + hash(i, 3, 77) * 2.4, BLUE.light, 1, "none", `opacity="${(1 - phase * 0.7).toFixed(2)}"`);
  }
  return [
    moon(f),
    `<clipPath id="soilClip"><rect x="100" y="${surface}" width="440" height="150"/></clipPath>`,
    `<rect x="100" y="${surface}" width="440" height="150" fill="url(#rock)" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    `<g clip-path="url(#soilClip)">${strata}${root(220, surface + 4, 46, 78, 1)}${root(430, surface + 4, 50, 92, 2)}${root(320, surface + 4, 74, 128, 3)}</g>`,
    path(`M100 ${surface}Q210 ${surface - 8} 320 ${surface}T540 ${surface}`, BLUE.pale, 1.8),
    fronds,
    arm(dig, true),
    spade,
    soil,
    reticle([320, surface + 70], 52 + (f % 2) * 2, f),
    callout([350, surface + 40], [452, 140], "TUBER"),
  ].join("");
}

// --- hydroponic bays ---------------------------------------------------------------

type Crop = "glowcap" | "sweetroot" | "lumina";

function plant(kind: Crop, cx: number, by: number, stage: number, f: number): string {
  const h = 14 + stage * 15;
  if (kind === "glowcap") return mushroom(cx, by, 5 + stage * 2.4, h, f, stage > 2);
  if (kind === "lumina") {
    return crystal(cx - 7, by, h * 0.6, 3 + stage, -10) + crystal(cx + 3, by, h, 4 + stage * 1.3, 4);
  }
  const top: Pt = [cx, by - h];
  return [
    line([cx, by], top, BLUE.pale, 1.6),
    leaf([cx, by - h * 0.5], [cx - 8 - stage * 3, by - h * 0.85], 4 + stage),
    leaf([cx, by - h * 0.6], [cx + 8 + stage * 3, by - h * 0.95], 4 + stage),
    stage > 1 ? leaf(top, [cx + 2, by - h - 12 - stage * 2], 4 + stage) : "",
  ].join("");
}

function hydroponics(kind: Crop, f: number): string {
  const trayW = 68;
  const x0 = 96;
  const y0 = 230;
  let trays = "";
  let stubs = "";
  for (let i = 0; i < 6; i++) {
    const x = x0 + i * (trayW + 6);
    const cx = x + trayW / 2;
    trays += plant(kind, cx, y0 + 2, i, f);
    trays += poly(
      [
        [x + 6, y0],
        [x + trayW - 6, y0],
        [x + trayW, y0 + 8],
        [x, y0 + 8],
      ],
      "url(#hull)",
      BLUE.light,
      1.2,
    );
    trays += poly(
      [
        [x, y0 + 8],
        [x + trayW, y0 + 8],
        [x + trayW - 8, y0 + 34],
        [x + 8, y0 + 34],
      ],
      "url(#hull)",
      BLUE.light,
      1.2,
    );
    trays += path(`M${x + 6} ${y0 + 3}q${trayW / 4} -4 ${trayW / 2 - 6} 0t${trayW / 2 - 6} 0`, BLUE.mid, 0.9);
    stubs +=
      line([cx - 6, y0 + 34], [cx - 6, 296], BLUE.light, 1.2) + line([cx + 6, y0 + 34], [cx + 6, 296], BLUE.light, 1.2);
  }
  const busX0 = x0 - 8;
  const busX1 = x0 + 6 * (trayW + 6) - 6;
  let arrows = "";
  for (let i = 0; i < 4; i++) {
    const x = busX0 + 20 + ((f * 28 + i * 105) % (busX1 - busX0 - 40));
    arrows += poly(
      [
        [x, 301],
        [x + 9, 306],
        [x, 311],
      ],
      BLUE.pale,
      BLUE.pale,
      1,
    );
  }
  let chart = "";
  const pts: Pt[] = [
    [120, 366],
    [150, 358],
    [180, 356],
    [212, 346],
    [250, 344],
    [290, 330],
    [330, 326],
    [380, 318],
  ];
  chart += `<polygon points="${[...pts, [380, 366] as Pt].map(P).join(" ")}" fill="${BLUE.light}" opacity=".18"/>`;
  chart += path(`M${pts.map(P).join("L")}`, BLUE.pale, 2);
  chart += path("M110 316V368H400", BLUE.mid, 1);
  for (let i = 0; i < 6; i++) chart += line([106, 322 + i * 9], [110, 322 + i * 9], BLUE.mid, 0.8);
  const dot = pts[[2, 4, 6, 7][f]];
  chart += circle(dot, 3.4, BLUE.pale, 1.2, BLUE.pale);
  const lit = [0.8, 1, 0.9, 1][f];
  return [
    `<polygon points="190,84 450,84 540,236 100,236" fill="${BLUE.light}" opacity="${(0.1 * lit).toFixed(2)}"/>`,
    `<rect x="178" y="68" width="284" height="16" rx="4" fill="none" stroke="${BLUE.pale}" stroke-width="1.6"/>`,
    `<rect x="190" y="74" width="260" height="6" rx="3" fill="${BLUE.pale}" opacity="${lit}"/>`,
    path("M178 76H120V230M462 76H520V230", BLUE.light, 1.4),
    trays,
    stubs,
    `<rect x="${busX0}" y="296" width="${busX1 - busX0}" height="16" rx="4" fill="url(#hull)" stroke="${BLUE.light}" stroke-width="1.4"/>`,
    arrows,
    chart,
    text(
      420,
      340,
      9,
      kind === "glowcap" ? "GLOWCAP BED" : kind === "sweetroot" ? "SWEETROOT BED" : "LUMINA BLOOM",
      BLUE.mid,
      'letter-spacing="1"',
    ),
  ].join("");
}

export const hydroGlowcap = (f: number) => hydroponics("glowcap", f);
export const hydroSweetroot = (f: number) => hydroponics("sweetroot", f);
export const hydroLumina = (f: number) => hydroponics("lumina", f);
