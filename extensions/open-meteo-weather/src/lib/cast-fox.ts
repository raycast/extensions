// Cast's anatomy: a modular vector fox. Poses are assembled from shared parts
// (head, ears, eyes, limbs, tail) in fox-local coordinates — origin at the
// ground point under the body center, y negative upward. Idle life (blinking,
// tail sway, ear twitches) is baked in as SMIL and loops seamlessly.

import { aOpacity, aRotate, aTranslate, animated } from "./cast-anim";
import { CAST, Pt, lerp, roundedTri, rotEllipse, shrinkTri } from "./cast-core";

export type Expression = "open" | "happy" | "sleepy" | "surprised" | "determined" | "curious" | "content" | "yawn";

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

/**
 * One ear relative to the head center. `side` -1 left / 1 right; `tilt`
 * flattens outward. The left ear occasionally twitches.
 */
function ear(side: number, tilt: number, twitch: boolean): string {
  const outer: [Pt, Pt, Pt] = [
    [side * 16, -48],
    [side * 84, -26],
    [side * 88, -128],
  ];
  const inner = shrinkTri(outer, 0.52);
  const apex = outer[2];
  const tip: [Pt, Pt, Pt] = [apex, lerp(apex, outer[0], 0.34), lerp(apex, outer[1], 0.34)];
  const baseCx = (outer[0][0] + outer[1][0]) / 2;
  const baseCy = (outer[0][1] + outer[1][1]) / 2;
  const shapes = `${roundedTri(outer, 14, CAST.fur)}${roundedTri(inner, 9, CAST.cream)}${roundedTri(tip, 7, CAST.charcoal)}`;
  const body = twitch
    ? animated(
        shapes,
        aRotate([0, 0, side * -9, 0, 0], baseCx, baseCy, { dur: 6.5, keyTimes: [0, 0.78, 0.84, 0.9, 1] }),
      )
    : shapes;
  return `<g transform="rotate(${side * tilt} ${baseCx} ${baseCy})">${body}</g>`;
}

interface EyeOptions {
  /** Shift pupils, e.g. up when watching clouds. */
  pupilDx?: number;
  pupilDy?: number;
  /** Disable the periodic blink (sunglasses, closed-eye expressions). */
  noBlink?: boolean;
}

function eyes(expr: Expression, o: EyeOptions = {}): string {
  const stroke = `stroke="${CAST.charcoal}" stroke-width="6" stroke-linecap="round" fill="none"`;
  if (expr === "happy")
    return `<path d="M -42 0 Q -29 -13 -16 0" ${stroke}/><path d="M 16 0 Q 29 -13 42 0" ${stroke}/>`;
  if (expr === "sleepy" || expr === "content" || expr === "yawn")
    return `<path d="M -42 -3 Q -29 6 -16 -3" ${stroke}/><path d="M 16 -3 Q 29 6 42 -3" ${stroke}/>`;
  const r = expr === "surprised" ? 15 : 13;
  const dx = o.pupilDx ?? 0;
  const dy = o.pupilDy ?? 0;
  const open = (x: number) =>
    `<circle cx="${x + dx}" cy="${-4 + dy}" r="${r}" fill="${CAST.charcoal}"/>
     <circle cx="${x + dx + 4}" cy="${-9 + dy}" r="4.5" fill="#FFFFFF"/>
     <circle cx="${x + dx - 4}" cy="${dy + 1}" r="2" fill="#FFFFFF" opacity="0.75"/>`;
  // Blink: fur-colored lids flash over the open eyes every few seconds.
  const lid = (x: number) =>
    `<ellipse cx="${x}" cy="-4" rx="15" ry="16" fill="${CAST.fur}"/><path d="M ${x - 13} -2 Q ${x} 6 ${x + 13} -2" ${stroke}/>`;
  const blink =
    expr === "surprised" || o.noBlink
      ? ""
      : `<g opacity="0">${lid(-29)}${lid(29)}${aOpacity([0, 0, 1, 0, 0], { dur: 4.4, keyTimes: [0, 0.88, 0.92, 0.96, 1], ease: false })}</g>`;
  return open(-29) + open(29) + blink;
}

function brows(expr: Expression): string {
  const s = `stroke="${CAST.charcoal}" stroke-width="5" stroke-linecap="round" opacity="0.75"`;
  if (expr === "determined")
    return `<line x1="-44" y1="-38" x2="-24" y2="-31" ${s}/><line x1="24" y1="-31" x2="44" y2="-38" ${s}/>`;
  if (expr === "curious")
    return `<line x1="-44" y1="-30" x2="-24" y2="-36" ${s}/><line x1="24" y1="-44" x2="44" y2="-37" ${s}/>`;
  if (expr === "surprised")
    return `<line x1="-42" y1="-36" x2="-24" y2="-40" ${s}/><line x1="24" y1="-40" x2="42" y2="-36" ${s}/>`;
  return `<line x1="-44" y1="-30" x2="-24" y2="-36" ${s}/><line x1="24" y1="-36" x2="44" y2="-30" ${s}/>`;
}

function mouth(expr: Expression): string {
  const stroke = `stroke="${CAST.charcoal}" stroke-width="5" stroke-linecap="round" fill="none"`;
  if (expr === "surprised") return `<ellipse cx="2" cy="40" rx="7" ry="8" fill="${CAST.charcoal}"/>`;
  if (expr === "yawn")
    return `<ellipse cx="1" cy="40" rx="10" ry="13" fill="${CAST.charcoal}"/><ellipse cx="1" cy="46" rx="5" ry="4" fill="${CAST.magenta}"/>`;
  if (expr === "sleepy" || expr === "content") return `<path d="M -6 38 Q 2 44 12 39" ${stroke}/>`;
  // The fox "w": two little arcs meeting under the nose.
  return `<path d="M -14 34 Q -7 42 0 35 Q 7 42 14 34" ${stroke}/>`;
}

/**
 * Cheek fluff: a soft rounded base with two gentle down-angled tufts.
 * Kept deliberately round — sharper spikes read as aggressive.
 */
function cheekTuft(side: number): string {
  const s = side;
  return (
    rotEllipse(s * 54, 12, 26, 20, s * -10, CAST.fur) +
    roundedTri(
      [
        [s * 44, -2],
        [s * 86, 12],
        [s * 46, 26],
      ],
      10,
      CAST.fur,
    ) +
    roundedTri(
      [
        [s * 40, 24],
        [s * 76, 42],
        [s * 40, 42],
      ],
      9,
      CAST.fur,
    )
  );
}

export interface HeadOptions {
  expr: Expression;
  /** Ear tilt in degrees; 0 perky, ~26 flattened. */
  earL?: number;
  earR?: number;
  sunglasses?: boolean;
  pupilDx?: number;
  pupilDy?: number;
  /** Ear twitch is on by default; disable for sleeping close-ups. */
  noTwitch?: boolean;
}

/** The head, centered at (0,0). Roughly 176 wide × 200 tall including ears. */
export function foxHead(o: HeadOptions): string {
  const glasses = o.sunglasses
    ? `<rect x="-46" y="-16" width="34" height="23" rx="8" fill="${CAST.charcoal}"/>
       <rect x="12" y="-16" width="34" height="23" rx="8" fill="${CAST.charcoal}"/>
       <rect x="-13" y="-9" width="26" height="6" rx="3" fill="${CAST.charcoal}"/>`
    : "";
  return `
    ${ear(-1, o.earL ?? 0, !o.noTwitch)}
    ${ear(1, o.earR ?? 0, false)}
    <circle cx="0" cy="0" r="70" fill="${CAST.fur}"/>
    ${cheekTuft(-1)}
    ${cheekTuft(1)}
    ${roundedTri(
      [
        [-22, -60],
        [12, -66],
        [-4, -88],
      ],
      6,
      CAST.fur,
    )}
    <ellipse cx="0" cy="30" rx="44" ry="30" fill="${CAST.cream}"/>
    ${rotEllipse(-48, 15, 11, 6.5, 8, CAST.furDeep, `opacity="0.4"`)}
    ${rotEllipse(48, 15, 11, 6.5, -8, CAST.furDeep, `opacity="0.4"`)}
    ${o.sunglasses ? "" : eyes(o.expr, { pupilDx: o.pupilDx, pupilDy: o.pupilDy })}
    ${o.sunglasses ? "" : brows(o.expr)}
    ${glasses}
    ${roundedTri(
      [
        [-10, 13],
        [10, 13],
        [0, 27],
      ],
      4,
      CAST.charcoal,
    )}
    <circle cx="-3" cy="17" r="2.2" fill="#FFFFFF" opacity="0.45"/>
    ${mouth(o.expr)}`;
}

// ---------------------------------------------------------------------------
// Worn & held props
// ---------------------------------------------------------------------------

/** Neck scarf; when `streaming`, the loose end flies and flutters. */
function scarf(streaming: boolean): string {
  const band = `<rect x="-62" y="-162" width="98" height="30" rx="15" fill="${CAST.purple}"/>`;
  if (streaming) {
    const tails = `
      <rect x="-160" y="-166" width="104" height="22" rx="11" fill="${CAST.purple}" transform="rotate(-10 -58 -150)"/>
      <rect x="-208" y="-152" width="68" height="17" rx="8.5" fill="${CAST.purple}" opacity="0.85" transform="rotate(-16 -58 -150)"/>`;
    return `${band}${animated(tails, aRotate([-4, 5, -4], -58, -150, { dur: 1.6 }))}`;
  }
  return `${band}<rect x="-8" y="-150" width="24" height="52" rx="11" fill="${CAST.purple}"/>
    <rect x="-4" y="-106" width="16" height="10" rx="4" fill="${CAST.magenta}" opacity="0.9"/>`;
}

/** Umbrella pole + hook, drawn behind the head so it never crosses the face. */
function umbrellaPole(): string {
  return `
    <path d="M -30 -26 Q -28 -4 -50 -8" stroke="${CAST.charcoal}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <line x1="-30" y1="-26" x2="-36" y2="-306" stroke="${CAST.charcoal}" stroke-width="7" stroke-linecap="round"/>`;
}

/** The magenta canopy, drawn in front so it caps the ears. */
function umbrellaCanopy(): string {
  return `
    <g transform="translate(-36 -306) rotate(8)">
      <path d="M -120 0 A 120 120 0 0 1 120 0 Z" fill="${CAST.magenta}"/>
      <path d="M -120 0 A 120 120 0 0 1 120 0" fill="none" stroke="${CAST.magentaDeep}" stroke-width="3" opacity="0.5"/>
      <path d="M 0 -118 Q -34 -60 -58 -4" stroke="${CAST.magentaDeep}" stroke-width="3.5" fill="none" opacity="0.55"/>
      <path d="M 0 -118 Q 34 -60 58 -4" stroke="${CAST.magentaDeep}" stroke-width="3.5" fill="none" opacity="0.55"/>
      <line x1="0" y1="-118" x2="0" y2="-134" stroke="${CAST.charcoal}" stroke-width="6" stroke-linecap="round"/>
    </g>`;
}

/** Steam curls rising from a point — mugs, coffee. Two staggered wisps. */
export function steam(x: number, y: number): string {
  const wisp = (begin: number) => {
    const rise = animated(
      `<path d="M ${x} ${y} q -6 -12 0 -22 q 6 -10 0 -22" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" fill="none"/>`,
      aTranslate(
        [
          [0, 0],
          [0, -26],
        ],
        { dur: 2.6, begin, ease: false },
      ),
    );
    return `<g opacity="0">${rise}${aOpacity([0, 0.8, 0], { dur: 2.6, begin, ease: false })}</g>`;
  };
  return wisp(0) + wisp(-1.3);
}

/** A cozy mug held in front of the chest, with rising steam. */
export function mug(): string {
  return `
    <path d="M -6 -136 a 12 12 0 1 0 0 22" stroke="${CAST.blue}" stroke-width="6" fill="none"/>
    <rect x="-52" y="-146" width="46" height="38" rx="9" fill="${CAST.blue}"/>
    <rect x="-52" y="-136" width="46" height="8" fill="${CAST.cream}" opacity="0.9"/>
    ${steam(-29, -150)}`;
}

/**
 * One articulated front limb, replacing the standing leg on that side.
 * `side` -1 left / 1 right (viewer's view); `angle` rotates around the
 * shoulder: 0 hangs down, positive swings toward the viewer's left.
 * Optional SMIL (from aRotate around the shoulder pivot) makes it move,
 * and `extra` rides along inside the arm group (brushes, lanterns).
 */
function arm(side: number, angle: number, anim?: string, extra = "", len = 68): string {
  const sx = side < 0 ? -36 : -4;
  const sy = -70;
  const shapes = `
    <rect x="${sx - 11}" y="${sy - 6}" width="22" height="${len}" rx="11" fill="${CAST.fur}"/>
    <ellipse cx="${sx}" cy="${sy + len - 8}" rx="13" ry="10" fill="${CAST.charcoal}"/>
    ${extra}`;
  const inner = anim ? animated(shapes, anim) : shapes;
  return `<g transform="rotate(${angle} ${sx} ${sy})">${inner}</g>`;
}

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------

export interface FoxOptions {
  expr: Expression;
  earL?: number;
  earR?: number;
  scarf?: "none" | "tied" | "streaming";
  umbrella?: boolean;
  sunglasses?: boolean;
  /** Tail: default curl, or streaming horizontally in wind. */
  tailStreaming?: boolean;
  /** Whole-body lean, degrees. */
  lean?: number;
  pupilDx?: number;
  pupilDy?: number;
  /** Replace a standing front leg with a posed arm. */
  armL?: { angle: number; anim?: string; extra?: string; len?: number };
  armR?: { angle: number; anim?: string; extra?: string; len?: number };
  /** Extra fox-local content drawn in front of the body, behind the head. */
  held?: string;
  /** Fox-local content drawn behind everything (backpacks, seat cushions). */
  behindBody?: string;
}

/**
 * The curled tail: layered segments sweeping up in a curve, capped by a cream
 * tip. Two cream bumps overlap the fur side of the seam so the tip reads as
 * fluff instead of a hard ellipse boundary.
 */
function tailCurled(): string {
  return (
    rotEllipse(48, -52, 46, 30, -58, CAST.fur) +
    rotEllipse(105, -95, 68, 40, -38, CAST.fur) +
    rotEllipse(146, -136, 46, 32, -24, CAST.fur) +
    rotEllipse(168, -152, 36, 26, -20, CAST.cream) +
    `<circle cx="144" cy="-164" r="12" fill="${CAST.cream}"/><circle cx="148" cy="-132" r="12" fill="${CAST.cream}"/>`
  );
}

/** The wind-blown tail, streaming horizontally with a fluffy cream tip. */
function tailStreamingShape(): string {
  return (
    rotEllipse(80, -64, 55, 30, -6, CAST.fur) +
    rotEllipse(150, -76, 66, 34, -10, CAST.fur) +
    rotEllipse(224, -86, 44, 28, -10, CAST.cream) +
    `<circle cx="192" cy="-70" r="12" fill="${CAST.cream}"/><circle cx="188" cy="-96" r="11" fill="${CAST.cream}"/>`
  );
}

/** Sitting fox, origin at the ground point under the body center. ~280 tall. */
export function foxSitting(o: FoxOptions): string {
  const tail = animated(
    o.tailStreaming ? tailStreamingShape() : tailCurled(),
    o.tailStreaming ? aRotate([-3, 4, -3], 55, -65, { dur: 1.8 }) : aRotate([-3, 4, -3], 30, -50, { dur: 3.4 }),
  );
  const toeNotch = (x: number) =>
    `<line x1="${x - 5}" y1="-13" x2="${x - 5}" y2="-5" stroke="#1F1A26" stroke-width="2.5" stroke-linecap="round"/>
     <line x1="${x + 4}" y1="-13" x2="${x + 4}" y2="-5" stroke="#1F1A26" stroke-width="2.5" stroke-linecap="round"/>`;
  const legL = o.armL
    ? arm(-1, o.armL.angle, o.armL.anim, o.armL.extra, o.armL.len)
    : `<rect x="-48" y="-76" width="24" height="70" rx="12" fill="${CAST.fur}"/><ellipse cx="-36" cy="-8" rx="16" ry="10" fill="${CAST.charcoal}"/>${toeNotch(-36)}`;
  const legR = o.armR
    ? arm(1, o.armR.angle, o.armR.anim, o.armR.extra, o.armR.len)
    : `<rect x="-16" y="-76" width="24" height="70" rx="12" fill="${CAST.fur}"/><ellipse cx="-4" cy="-8" rx="16" ry="10" fill="${CAST.charcoal}"/>${toeNotch(-4)}`;
  // Small cream bumps along the chest patch edges read as fluff.
  const chestFluff = `
    <circle cx="-54" cy="-120" r="9" fill="${CAST.cream}"/>
    <circle cx="-58" cy="-98" r="10" fill="${CAST.cream}"/>
    <circle cx="-52" cy="-78" r="9" fill="${CAST.cream}"/>
    <circle cx="24" cy="-116" r="9" fill="${CAST.cream}"/>
    <circle cx="27" cy="-95" r="10" fill="${CAST.cream}"/>`;
  const body = `
    ${o.behindBody ?? ""}
    ${tail}
    <ellipse cx="10" cy="-96" rx="88" ry="98" fill="${CAST.fur}"/>
    ${rotEllipse(64, -132, 26, 48, -18, CAST.furDeep, `opacity="0.16"`)}
    <ellipse cx="48" cy="-72" rx="46" ry="56" fill="${CAST.furDeep}" opacity="0.28"/>
    <ellipse cx="-16" cy="-92" rx="42" ry="58" fill="${CAST.cream}"/>
    ${chestFluff}
    ${legL}
    ${legR}
    ${o.scarf && o.scarf !== "none" ? scarf(o.scarf === "streaming") : ""}
    ${o.umbrella ? umbrellaPole() : ""}
    ${o.held ?? ""}
    <g transform="translate(-16 -208)">${foxHead(o)}</g>
    ${o.umbrella ? umbrellaCanopy() : ""}`;
  return o.lean ? `<g transform="rotate(${o.lean} 0 0)">${body}</g>` : body;
}

/** Lying-down fox for warm, lazy weather. Wider (~420) and lower (~160 tall). */
export function foxBasking(o: FoxOptions & { headUp?: boolean }): string {
  const tail = animated(
    rotEllipse(150, -52, 62, 32, 22, CAST.fur) +
      rotEllipse(205, -30, 48, 28, 30, CAST.fur) +
      rotEllipse(236, -20, 34, 24, 30, CAST.cream) +
      `<circle cx="208" cy="-36" r="10" fill="${CAST.cream}"/><circle cx="204" cy="-10" r="10" fill="${CAST.cream}"/>`,
    aRotate([-3, 3, -3], 120, -40, { dur: 3.8 }),
  );
  return `
    ${tail}
    <ellipse cx="28" cy="-52" rx="128" ry="54" fill="${CAST.fur}"/>
    <ellipse cx="96" cy="-58" rx="52" ry="46" fill="${CAST.fur}"/>
    <ellipse cx="102" cy="-48" rx="38" ry="32" fill="${CAST.furDeep}" opacity="0.28"/>
    <ellipse cx="34" cy="-26" rx="90" ry="24" fill="${CAST.cream}"/>
    <rect x="-116" y="-38" width="52" height="19" rx="9.5" fill="${CAST.fur}"/>
    <rect x="-108" y="-18" width="52" height="18" rx="9" fill="${CAST.fur}"/>
    <ellipse cx="-114" cy="-28" rx="9" ry="8" fill="${CAST.charcoal}"/>
    <ellipse cx="-106" cy="-9" rx="9" ry="8" fill="${CAST.charcoal}"/>
    ${o.held ?? ""}
    <g transform="translate(-88 -102) rotate(${o.headUp ? -20 : -6})">${foxHead(o)}</g>`;
}

/** Curled-up fox for nights and cold snaps. Compact (~200 wide). */
export function foxCurled(o: FoxOptions): string {
  return `
    <ellipse cx="6" cy="-76" rx="84" ry="80" fill="${CAST.fur}"/>
    <ellipse cx="34" cy="-62" rx="44" ry="46" fill="${CAST.furDeep}" opacity="0.25"/>
    ${o.scarf === "tied" ? `<rect x="-72" y="-134" width="88" height="24" rx="12" fill="${CAST.purple}" transform="rotate(-9 -28 -122)"/>` : ""}
    <g transform="translate(-32 -116) rotate(-9)">${foxHead(o)}</g>
    ${rotEllipse(-2, -30, 100, 34, 12, CAST.fur)}
    ${rotEllipse(-88, -48, 36, 26, 12, CAST.cream)}
    <circle cx="-62" cy="-60" r="10" fill="${CAST.cream}"/>
    <circle cx="-58" cy="-38" r="10" fill="${CAST.cream}"/>`;
}

/**
 * Just the head and two gripping paws, for peeking around things (tree
 * trunks, windowsills). Origin at the head center; paws grip at y≈64.
 */
export function foxPeek(o: HeadOptions & { pawXs?: [number, number] }): string {
  const [p1, p2] = o.pawXs ?? [-26, 22];
  const paw = (x: number) =>
    `<rect x="${x - 13}" y="52" width="26" height="30" rx="12" fill="${CAST.fur}"/><ellipse cx="${x}" cy="80" rx="12" ry="8" fill="${CAST.charcoal}"/>`;
  return `${paw(p1)}${paw(p2)}${foxHead(o)}`;
}
