// The activity catalog: every scene Cast can act out.
// Each activity composes set pieces, a posed fox, and foreground props into a
// Stage; the renderer stacks it between the sky and the weather overlay.

import { aAttr, aOpacity, aRotate, aScale, aTranslate, aTranslateLinear, animated, placedAnimated } from "./cast-anim";
import { CAST, CastScene, FONT, GROUND_Y, SceneConditions, W, mulberry, roundedTri, rotEllipse } from "./cast-core";
import { Expression, FoxOptions, foxBasking, foxCurled, foxPeek, foxSitting, mug, steam } from "./cast-fox";
import {
  appleTree,
  birds,
  butterfly,
  fireflies,
  flowerPatch,
  hawk,
  heatShimmer,
  house,
  mountains,
  pond,
  porch,
  rainbowArc,
  shootingStar,
  zzz,
} from "./cast-stage";

export interface Stage {
  /** Scene-space content behind the fox (set pieces). */
  behind?: string;
  /** Scene-space content drawn before the ground hills (far backdrops). */
  farBehind?: string;
  /** Fox-local artwork; omit when the fox is embedded in `behind`/`front`. */
  fox?: string;
  foxX?: number;
  foxY?: number;
  foxScale?: number;
  /** Extra whole-fox SMIL transforms, one nested group each (bob, slide…). */
  foxAnims?: string[];
  /** Scene-space content in front of the fox. */
  front?: string;
  noShadow?: boolean;
  shadowRx?: number;
}

export interface ActivityDef {
  id: CastScene["activity"];
  title: string;
  pose: string;
  props: string[];
  mood: string;
  compose: (scene: CastScene, ip: string) => Stage;
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function scarfFor(scene: CastScene): FoxOptions["scarf"] {
  return scene.feel === "cold" ? "tied" : "none";
}

function isNight(scene: CastScene): boolean {
  return scene.phase === "night";
}

/** The distant den-house on the left hill — Cast's home, in most scenes. */
function homeFar(scene: CastScene, opts: { lit?: boolean } = {}): string {
  const night = isNight(scene);
  const snowy = scene.weather === "snow" || scene.season === "winter";
  return house(140, 396, 0.8, {
    night,
    lit: opts.lit ?? (night || scene.weather === "storm" || scene.weather === "heavyRain"),
    snowRoof: snowy,
  });
}

/** The apple tree on the right, small, matching the season. */
function treeFar(scene: CastScene): string {
  return appleTree(766, 408, 0.72, scene.season, {
    night: isNight(scene),
    apples: scene.season === "summer",
    fallingLeaves: scene.season === "autumn" && scene.weather !== "wind",
  });
}

/** A wooden basket, origin at ground center. */
function basket(x: number, y: number, withApples: boolean): string {
  const apples = withApples
    ? `<circle cx="-10" cy="-26" r="8" fill="#E5484D"/><circle cx="8" cy="-28" r="8" fill="#E5484D"/>`
    : "";
  return `<g transform="translate(${x} ${y})">
    ${apples}
    <path d="M -30 -24 L -24 0 L 24 0 L 30 -24 Z" fill="${CAST.wood}"/>
    <path d="M -30 -24 L -24 0 L 24 0 L 30 -24" fill="none" stroke="${CAST.woodDeep}" stroke-width="3"/>
    <line x1="-28" y1="-16" x2="28" y2="-16" stroke="${CAST.woodDeep}" stroke-width="2.5" opacity="0.6"/>
  </g>`;
}

/** Tiny weather painting for the easel canvas. */
function miniWeather(scene: CastScene): string {
  const w = scene.weather;
  const cloud = (x: number, y: number, f: string) =>
    `<ellipse cx="${x}" cy="${y}" rx="14" ry="8" fill="${f}"/><ellipse cx="${x - 10}" cy="${y + 3}" rx="8" ry="6" fill="${f}"/><ellipse cx="${x + 10}" cy="${y + 3}" rx="9" ry="6" fill="${f}"/>`;
  if (w === "clear")
    return `<circle cx="0" cy="-2" r="10" fill="${CAST.yellow}"/><circle cx="0" cy="-2" r="14" fill="${CAST.yellow}" opacity="0.3"/>`;
  if (w === "partly") return `<circle cx="-7" cy="-7" r="8" fill="${CAST.yellow}"/>${cloud(5, 2, "#FFFFFF")}`;
  if (w === "snow")
    return `${cloud(0, -6, "#E7EEF4")}<circle cx="-8" cy="8" r="2" fill="#9FB6CE"/><circle cx="2" cy="12" r="2" fill="#9FB6CE"/><circle cx="10" cy="7" r="2" fill="#9FB6CE"/>`;
  if (w === "storm")
    return `${cloud(0, -8, "#5A6478")}<polygon points="-2,-2 -8,8 -3,8 -7,18 4,7 0,7 5,-2" fill="${CAST.yellow}"/>`;
  if (w === "fog")
    return `<line x1="-12" y1="-6" x2="12" y2="-6" stroke="#9FB6CE" stroke-width="3" stroke-linecap="round"/><line x1="-9" y1="1" x2="14" y2="1" stroke="#9FB6CE" stroke-width="3" stroke-linecap="round"/><line x1="-14" y1="8" x2="9" y2="8" stroke="#9FB6CE" stroke-width="3" stroke-linecap="round"/>`;
  if (w === "wind")
    return `<path d="M -12 -4 q 8 -6 16 0 t 10 2" stroke="${CAST.cyan}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M -10 6 q 7 -5 14 0" stroke="${CAST.cyan}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (w === "cloudy") return `${cloud(-4, -6, "#C3CEDA")}${cloud(8, 4, "#E7EEF4")}`;
  return `${cloud(0, -8, "#8CA6C0")}<line x1="-7" y1="4" x2="-10" y2="14" stroke="${CAST.blue}" stroke-width="3" stroke-linecap="round"/><line x1="4" y1="4" x2="1" y2="14" stroke="${CAST.blue}" stroke-width="3" stroke-linecap="round"/>`;
}

/**
 * Show `inner` only during the [from, to] fraction of a `dur`-second loop,
 * with short linear crossfade ramps. Building block for the "special" long
 * scenes that play a multi-stage story (sleep → stretch → sit).
 */
function during(inner: string, dur: number, from: number, to: number): string {
  const f = 0.04;
  let values: number[];
  let keyTimes: number[];
  if (from === 0) {
    // Visible at the start; fades back in just before the loop ends.
    values = [1, 1, 0, 0, 1];
    keyTimes = [0, to - f, to, 1 - f, 1];
  } else if (to === 1) {
    // Visible through the end; the loop-start stage covers the hard cut at 0.
    values = [0, 0, 1, 1];
    keyTimes = [0, from - f, from, 1];
  } else {
    values = [0, 0, 1, 1, 0, 0];
    keyTimes = [0, from - f, from, to - f, to, 1];
  }
  return `<g opacity="${from === 0 ? 1 : 0}">${aOpacity(values, { dur, keyTimes, ease: false })}${inner}</g>`;
}

/** The porch stage shared by the daily-routine scenes; sheltered in any weather. */
function porchStage(scene: CastScene, opts: { lit?: boolean } = {}): string {
  const snowy = scene.weather === "snow" || scene.season === "winter";
  return (
    house(640, GROUND_Y, 1.5, { lit: opts.lit ?? true, night: isNight(scene), snowRoof: snowy }) +
    porch(455, GROUND_Y + 26, 1.4)
  );
}

/** Fox placed at the porch position used by all routine scenes. */
function atPorch(inner: string): string {
  return `<g transform="translate(455 452) scale(0.72)">${inner}</g>`;
}

const PORCH_SHADOW = `<ellipse cx="455" cy="454" rx="86" ry="11" fill="${CAST.charcoal}" opacity="0.13"/>`;

function exprForWeather(scene: CastScene): Expression {
  if (scene.weather === "storm") return "surprised";
  if (scene.weather === "clear" && scene.phase === "day") return "happy";
  if (scene.phase === "night") return "sleepy";
  return "open";
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

const sit: ActivityDef = {
  id: "sit",
  title: "Just Sitting",
  pose: "sitting tall, tail curled around the paws",
  props: [],
  mood: "Watchful",
  compose: (scene) => ({
    behind: homeFar(scene) + treeFar(scene),
    fox: foxSitting({
      expr: exprForWeather(scene),
      scarf: scene.windy && scene.feel === "cold" ? "streaming" : scarfFor(scene),
      tailStreaming: scene.windy,
      earL: scene.windy ? 10 : 0,
      earR: scene.windy ? 16 : 0,
    }),
  }),
};

const nap: ActivityDef = {
  id: "nap",
  title: "Grey-Day Nap",
  pose: "curled into a crescent, nose under tail",
  props: [],
  mood: "Dozy",
  compose: (scene) => ({
    behind: homeFar(scene) + treeFar(scene),
    fox: foxCurled({ expr: "sleepy", scarf: scarfFor(scene) }),
    shadowRx: 100,
  }),
};

const windowWatch: ActivityDef = {
  id: "windowWatch",
  title: "Window Watching",
  pose: "nose to the glass, paws on the sill",
  props: ["warm window", "racing raindrops"],
  mood: "Cozy",
  compose: (scene, ip) => {
    const cx = 538;
    const cy = 296;
    const raceDrop = (dx: number, begin: number) =>
      `<circle cx="${cx + dx}" cy="${cy - 26}" r="2.5" fill="${CAST.cyan}" opacity="0">
        ${aTranslate(
          [
            [0, 0],
            [2, 52],
          ],
          { dur: 2.4, begin, ease: false },
        )}${aOpacity([0, 0.9, 0.9, 0], { dur: 2.4, begin, keyTimes: [0, 0.1, 0.85, 1], ease: false })}
      </circle>`;
    const peek = placedAnimated(
      `translate(${cx} ${cy + 4}) scale(0.48)`,
      foxPeek({ expr: "curious", pawXs: [-30, 26], pupilDy: 3 }),
      aTranslate(
        [
          [0, -2],
          [0, 3],
          [0, -2],
        ],
        { dur: 4.2 },
      ),
    );
    return {
      behind:
        house(470, 412, 2.0, { lit: true, night: isNight(scene) }) +
        `<clipPath id="${ip}win"><circle cx="${cx}" cy="${cy}" r="28"/></clipPath>` +
        `<g clip-path="url(#${ip}win)">${peek}${raceDrop(-18, 0)}${raceDrop(14, -1.1)}</g>` +
        `<line x1="${cx}" y1="${cy - 30}" x2="${cx}" y2="${cy + 30}" stroke="${CAST.cream}" stroke-width="6"/>
         <line x1="${cx - 30}" y1="${cy}" x2="${cx + 30}" y2="${cy}" stroke="${CAST.cream}" stroke-width="6"/>
         <circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="${CAST.cream}" stroke-width="9"/>`,
      noShadow: true,
    };
  },
};

const porchCocoa: ActivityDef = {
  id: "porchCocoa",
  title: "Porch Cocoa",
  pose: "tucked under the awning, both paws on the mug",
  props: ["cocoa mug", "porch awning"],
  mood: "Braced",
  compose: (scene) => ({
    behind: house(640, GROUND_Y, 1.5, { lit: true, night: isNight(scene) }) + porch(455, GROUND_Y + 26, 1.4),
    fox: foxSitting({ expr: "surprised", earL: 18, earR: 20, scarf: "tied", held: mug() }),
    foxX: 455,
    foxY: 452,
    foxScale: 0.72,
  }),
};

const porchCoffee: ActivityDef = {
  id: "porchCoffee",
  title: "Porch Coffee",
  pose: "on the porch step, mug steaming, eyes on the horizon",
  props: ["coffee mug", "sunrise"],
  mood: "Serene",
  compose: (scene) => ({
    behind: house(640, GROUND_Y, 1.5, { lit: true, night: false }) + porch(455, GROUND_Y + 26, 1.4),
    fox: foxSitting({ expr: "content", scarf: scarfFor(scene), held: mug() }),
    foxX: 455,
    foxY: 452,
    foxScale: 0.72,
    front: birds(150, 24),
  }),
};

const raking: ActivityDef = {
  id: "raking",
  title: "Raking Leaves",
  pose: "leaning into the rake, very serious about it",
  props: ["rake", "leaf pile"],
  mood: "Industrious",
  compose: (scene) => {
    const pile = `<g transform="translate(420 446)">
      ${rotEllipse(0, -10, 62, 24, 0, "#D97A2B")}${rotEllipse(-26, -22, 30, 14, -14, "#B8551F")}${rotEllipse(24, -24, 28, 13, 12, "#E8A65A")}
      <g opacity="0">${animated(
        rotEllipse(0, -30, 9, 4.5, 20, "#B8551F"),
        aTranslate(
          [
            [0, 0],
            [-14, -34],
          ],
          { dur: 2.2, ease: false },
        ),
      )}${aOpacity([0, 0.9, 0], { dur: 2.2, ease: false })}</g>
      <g opacity="0">${animated(
        rotEllipse(10, -30, 9, 4.5, -16, "#D97A2B"),
        aTranslate(
          [
            [0, 0],
            [16, -28],
          ],
          { dur: 2.2, begin: -1.1, ease: false },
        ),
      )}${aOpacity([0, 0.9, 0], { dur: 2.2, begin: -1.1, ease: false })}</g>
    </g>`;
    const rake = `
      <line x1="-150" y1="-14" x2="16" y2="-108" stroke="${CAST.wood}" stroke-width="8" stroke-linecap="round"/>
      <g transform="translate(-150 -14) rotate(-24)">
        <rect x="-26" y="-5" width="52" height="10" rx="5" fill="${CAST.woodDeep}"/>
        ${[-20, -10, 0, 10, 20].map((tx) => `<line x1="${tx}" y1="4" x2="${tx}" y2="18" stroke="${CAST.woodDeep}" stroke-width="4" stroke-linecap="round"/>`).join("")}
      </g>`;
    return {
      behind:
        homeFar(scene) +
        appleTree(716, GROUND_Y + 6, 1.1, "autumn", { fallingLeaves: true, night: isNight(scene) }) +
        pile,
      fox: foxSitting({ expr: "determined", scarf: scarfFor(scene), held: rake, pupilDx: -5, pupilDy: 3 }),
      foxX: 570,
      foxAnims: [
        aTranslate(
          [
            [0, 0],
            [-9, 0],
            [0, 0],
          ],
          { dur: 2.2 },
        ),
      ],
    };
  },
};

const picnic: ActivityDef = {
  id: "picnic",
  title: "Picnic",
  pose: "settled on the blanket, mid-snack",
  props: ["checkered blanket", "basket", "butterfly"],
  mood: "Delighted",
  compose: (scene) => {
    const blanket = `<g transform="translate(540 438)">
      <rect x="-155" y="-28" width="310" height="56" rx="14" fill="${CAST.magenta}" opacity="0.92"/>
      ${[-100, -40, 20, 80].map((gx) => `<line x1="${gx}" y1="-28" x2="${gx + 24}" y2="28" stroke="${CAST.cream}" stroke-width="3" opacity="0.5"/>`).join("")}
      <line x1="-150" y1="-6" x2="150" y2="-6" stroke="${CAST.cream}" stroke-width="3" opacity="0.5"/>
    </g>`;
    const spread = `${basket(652, 446, true)}<circle cx="612" cy="446" r="8" fill="#E5484D"/><rect x="586" y="432" width="14" height="18" rx="3" fill="${CAST.cream}"/>`;
    return {
      behind: homeFar(scene) + treeFar(scene) + blanket + spread,
      fox: foxSitting({ expr: "happy", scarf: "none" }),
      foxX: 486,
      foxY: 458,
      foxScale: 0.92,
      foxAnims: [
        aTranslate(
          [
            [0, 0],
            [0, -5],
            [0, 0],
          ],
          { dur: 2.4 },
        ),
      ],
      front: butterfly(320, 262),
      noShadow: true,
    };
  },
};

const applePicking: ActivityDef = {
  id: "applePicking",
  title: "Apple Picking",
  pose: "on tiptoes, one paw stretched into the crown",
  props: ["apple tree", "basket"],
  mood: "Ambitious",
  compose: (scene) => {
    const fallingApple = `<g opacity="0">
      <g><circle cx="0" cy="0" r="8" fill="#E5484D"/><animateMotion path="M 661 226 C 648 300, 572 386, 552 434" keyPoints="0;0;1;1" keyTimes="0;0.55;0.72;1" calcMode="linear" dur="6s" repeatCount="indefinite"/></g>
      ${aOpacity([0, 0, 0.98, 0.98, 0], { dur: 6, keyTimes: [0, 0.55, 0.6, 0.72, 1], ease: false })}
    </g>`;
    return {
      behind:
        homeFar(scene) +
        appleTree(640, GROUND_Y + 4, 1.5, "summer", { apples: true, night: isNight(scene) }) +
        basket(548, 452, true),
      fox: foxSitting({
        expr: "determined",
        scarf: scarfFor(scene),
        armR: { angle: -115, len: 100 },
        pupilDx: 6,
        pupilDy: -5,
      }),
      foxX: 452,
      foxScale: 0.95,
      foxAnims: [
        aTranslate(
          [
            [0, 0],
            [0, -6],
            [0, 0],
          ],
          { dur: 1.9 },
        ),
      ],
      front: fallingApple,
    };
  },
};

const painting: ActivityDef = {
  id: "painting",
  title: "Plein Air Painting",
  pose: "brush in paw, comparing sky and canvas",
  props: ["easel", "palette", "very honest painting"],
  mood: "Artistic",
  compose: (scene) => {
    const easel = `<g transform="translate(330 ${GROUND_Y + 8})">
      <line x1="-30" y1="0" x2="0" y2="-118" stroke="${CAST.wood}" stroke-width="7" stroke-linecap="round"/>
      <line x1="30" y1="0" x2="0" y2="-118" stroke="${CAST.wood}" stroke-width="7" stroke-linecap="round"/>
      <line x1="0" y1="-40" x2="16" y2="0" stroke="${CAST.wood}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>
      <g transform="translate(0 -96) rotate(-2)">
        <rect x="-46" y="-36" width="92" height="72" rx="5" fill="${CAST.cream}" stroke="${CAST.wood}" stroke-width="4"/>
        <g transform="translate(0 2)">${miniWeather(scene)}</g>
      </g>
    </g>`;
    const palette = `<g transform="translate(462 ${GROUND_Y + 40})">
      <ellipse cx="0" cy="0" rx="34" ry="14" fill="${CAST.cream}" stroke="${CAST.wood}" stroke-width="3"/>
      <circle cx="-16" cy="-3" r="4" fill="${CAST.magenta}"/><circle cx="-4" cy="2" r="4" fill="${CAST.purple}"/>
      <circle cx="8" cy="-4" r="4" fill="${CAST.blue}"/><circle cx="18" cy="2" r="4" fill="${CAST.yellow}"/>
    </g>`;
    const brush = `
      <line x1="-36" y1="-24" x2="-36" y2="16" stroke="${CAST.wood}" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="-36" cy="24" rx="5.5" ry="10" fill="${CAST.magenta}"/>`;
    return {
      behind: homeFar(scene) + treeFar(scene) + easel + palette,
      fox: foxSitting({
        expr: "curious",
        scarf: scarfFor(scene),
        armL: { angle: 58, anim: aRotate([-7, 7, -7], -36, -70, { dur: 1.7 }), extra: brush },
        pupilDx: -6,
      }),
      foxX: 570,
      foxScale: 0.95,
    };
  },
};

const gardening: ActivityDef = {
  id: "gardening",
  title: "Gardening",
  pose: "tipping the watering can with great care",
  props: ["watering can", "flower patch"],
  mood: "Nurturing",
  compose: (scene) => {
    const can = `<g transform="translate(-74 -68) rotate(-26)">
      <rect x="-30" y="-17" width="60" height="34" rx="9" fill="${CAST.blue}"/>
      <line x1="-28" y1="-6" x2="-58" y2="-28" stroke="${CAST.blue}" stroke-width="10" stroke-linecap="round"/>
      <circle cx="-60" cy="-30" r="7" fill="${CAST.blue}"/>
      <path d="M -4 -17 a 17 17 0 0 1 32 0" stroke="${CAST.blue}" stroke-width="5" fill="none"/>
    </g>`;
    const drop = (begin: number, dx: number) =>
      `<circle cx="${394 + dx}" cy="358" r="3.2" fill="${CAST.cyan}" opacity="0">
        ${aTranslate(
          [
            [0, 0],
            [-56 + dx * 0.4, 86],
          ],
          { dur: 1.4, begin, ease: false },
        )}${aOpacity([0, 0.9, 0.9, 0], { dur: 1.4, begin, keyTimes: [0, 0.12, 0.8, 1], ease: false })}
      </circle>`;
    return {
      behind: homeFar(scene) + treeFar(scene) + flowerPatch(330, GROUND_Y + 42),
      fox: foxSitting({ expr: "content", scarf: "none", held: can, pupilDx: -6, pupilDy: 4 }),
      foxX: 520,
      foxScale: 0.95,
      front: drop(0, 0) + drop(-0.45, 8) + drop(-0.9, -7) + butterfly(250, 300, CAST.purple),
    };
  },
};

const hideSeek: ActivityDef = {
  id: "hideSeek",
  title: "Hide and Seek",
  pose: "peeking around the trunk, tail giving him away",
  props: ["old thick-trunked tree", "extremely visible tail"],
  mood: "Sneaky",
  compose: (scene) => {
    // An old tree with a wide trunk (x≈523–597 at this scale). The head leans
    // out on the left with both eyes clear of the bark; the second paw and the
    // tail base sit behind the trunk so only the tail tip shows on the right.
    const peek = placedAnimated(
      `translate(500 374) scale(0.75)`,
      foxPeek({ expr: "curious", earL: 6, pupilDx: 5, pawXs: [30, 60] }),
      aTranslate(
        [
          [0, 0],
          [-9, 3],
          [0, 0],
        ],
        { dur: 3.2 },
      ),
    );
    const tail = placedAnimated(
      `translate(590 398) scale(1.15)`,
      animated(
        rotEllipse(34, -26, 52, 24, -32, CAST.fur) +
          rotEllipse(64, -50, 24, 16, -32, CAST.cream) +
          `<circle cx="50" cy="-38" r="9" fill="${CAST.cream}"/>`,
        aRotate([-14, 8, -14], 0, 0, { dur: 0.95 }),
      ),
    );
    return {
      behind:
        homeFar(scene) +
        tail +
        peek +
        appleTree(560, GROUND_Y + 4, 1.7, scene.season, {
          night: isNight(scene),
          apples: scene.season === "autumn",
          trunkWidth: 44,
        }),
      noShadow: true,
    };
  },
};

const cloudWatch: ActivityDef = {
  id: "cloudWatch",
  title: "Cloud Watching",
  pose: "flat on the hill, nose to the sky",
  props: ["one suspiciously fox-shaped cloud"],
  mood: "Dreamy",
  compose: (scene) => {
    const foxCloud = placedAnimated(
      `translate(280 140)`,
      `<g fill="#FFFFFF" opacity="0.95">
        <ellipse cx="0" cy="0" rx="52" ry="30"/><ellipse cx="-44" cy="10" rx="30" ry="20"/><ellipse cx="44" cy="10" rx="32" ry="20"/>
        ${roundedTri(
          [
            [-38, -22],
            [-10, -26],
            [-30, -52],
          ],
          6,
          "#FFFFFF",
        )}
        ${roundedTri(
          [
            [8, -26],
            [36, -20],
            [26, -50],
          ],
          6,
          "#FFFFFF",
        )}
      </g>`,
      aTranslate(
        [
          [0, 0],
          [26, 0],
          [0, 0],
        ],
        { dur: 16 },
      ),
    );
    return {
      behind: homeFar(scene) + treeFar(scene) + foxCloud,
      fox: foxBasking({ expr: "open", headUp: true, pupilDy: -6 }),
      foxX: 560,
      shadowRx: 150,
    };
  },
};

const umbrella: ActivityDef = {
  id: "umbrella",
  title: "Umbrella Walk",
  pose: "sitting snug under the magenta umbrella",
  props: ["umbrella"],
  mood: "Unbothered",
  compose: (scene) => ({
    behind: homeFar(scene) + treeFar(scene),
    fox: foxSitting({ expr: "content", scarf: scarfFor(scene), umbrella: true }),
    foxAnims: [aRotate([-1.6, 1.6, -1.6], 0, -60, { dur: 3.2 })],
  }),
};

const kite: ActivityDef = {
  id: "kite",
  title: "Kite Flying",
  pose: "leaning back, both eyes on the kite",
  props: ["diamond kite", "streaming scarf"],
  mood: "Exhilarated",
  compose: (scene) => {
    const kiteShape = `
      <g transform="translate(-238 -148)">
        ${animated(
          `<path d="M 0 -34 L 24 0 L 0 34 L -24 0 Z" fill="${CAST.magenta}"/>
           <line x1="0" y1="-34" x2="0" y2="34" stroke="${CAST.magentaDeep}" stroke-width="2.5" opacity="0.7"/>
           <line x1="-24" y1="0" x2="24" y2="0" stroke="${CAST.magentaDeep}" stroke-width="2.5" opacity="0.7"/>
           ${roundedTri(
             [
               [0, 36],
               [10, 52],
               [-8, 54],
             ],
             3,
             CAST.purple,
           )}
           ${roundedTri(
             [
               [4, 62],
               [14, 76],
               [-4, 78],
             ],
             3,
             CAST.cyan,
           )}`,
          aRotate([-9, 9, -9], 0, 0, { dur: 1.4 }),
        )}
      </g>
      <line x1="0" y1="0" x2="-224" y2="-130" stroke="${CAST.charcoal}" stroke-width="2.5" opacity="0.75"/>`;
    const rig = placedAnimated(`translate(507 352)`, kiteShape, aRotate([-7, 6, -7], 0, 0, { dur: 3.4 }));
    return {
      behind: homeFar(scene) + treeFar(scene),
      fox: foxSitting({
        expr: "happy",
        lean: -8,
        scarf: "streaming",
        tailStreaming: true,
        earL: 10,
        earR: 16,
        armL: { angle: 135 },
        pupilDx: -6,
        pupilDy: -5,
      }),
      front: rig,
    };
  },
};

const hike: ActivityDef = {
  id: "hike",
  title: "Mountain Hike",
  pose: "backpack on, surveying the summit",
  props: ["backpack", "summit flag", "a circling hawk"],
  mood: "Adventurous",
  compose: (scene) => {
    // Summit flag on the tallest (right-hand) peak; see mountains() in cast-stage.
    const flag = `<g transform="translate(730 196)">
      <line x1="0" y1="0" x2="0" y2="-42" stroke="${CAST.charcoal}" stroke-width="4" stroke-linecap="round"/>
      ${animated(
        roundedTri(
          [
            [0, -42],
            [34, -33],
            [0, -24],
          ],
          3,
          CAST.magenta,
        ),
        aRotate([0, 6, 0], 0, -33, { dur: 1.2 }),
      )}
    </g>`;
    const backpack = `
      <rect x="42" y="-168" width="60" height="72" rx="16" fill="${CAST.purple}"/>
      <rect x="52" y="-142" width="40" height="24" rx="8" fill="${CAST.magenta}" opacity="0.85"/>`;
    const strap = `<path d="M -54 -148 Q -18 -122 20 -108" stroke="${CAST.purple}" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.95"/>`;
    return {
      farBehind: mountains(isNight(scene)) + flag,
      behind: hawk(600, 150),
      fox: foxSitting({
        expr: "determined",
        scarf: scene.feel === "cold" ? "streaming" : "none",
        earL: 6,
        earR: 12,
        behindBody: backpack,
        held: strap,
        pupilDx: -5,
        pupilDy: -4,
      }),
      foxX: 470,
    };
  },
};

const lemonade: ActivityDef = {
  id: "lemonade",
  title: "Lemonade Shade",
  pose: "melted flat in the tree shade, sunglasses on",
  props: ["sunglasses", "lemonade", "heat shimmer"],
  mood: "Liquefied",
  compose: () => {
    const glass = `<g transform="translate(392 ${GROUND_Y + 2})">
      <rect x="-14" y="-40" width="28" height="40" rx="5" fill="#FFE9A8" stroke="${CAST.cream}" stroke-width="3.5"/>
      <line x1="6" y1="-54" x2="-2" y2="-24" stroke="${CAST.magenta}" stroke-width="4" stroke-linecap="round"/>
      ${animated(
        `<rect x="-8" y="-30" width="10" height="10" rx="3" fill="#FFFFFF" opacity="0.85"/>`,
        aTranslate(
          [
            [0, 0],
            [0, -4],
            [0, 0],
          ],
          { dur: 1.7 },
        ),
      )}
    </g>`;
    return {
      behind:
        // Crown top lands at y≈210, just under the condition label; further left it would sit behind the text.
        appleTree(300, GROUND_Y + 4, 1.15, "summer", { apples: true }) +
        `<ellipse cx="470" cy="${GROUND_Y + 34}" rx="240" ry="26" fill="${CAST.charcoal}" opacity="0.1"/>` +
        glass,
      fox: foxBasking({ expr: "content", sunglasses: true }),
      foxX: 560,
      shadowRx: 150,
      front: heatShimmer(),
    };
  },
};

const leafBoat: ActivityDef = {
  id: "leafBoat",
  title: "Leaf Boat Regatta",
  pose: "hunched over the puddle, fully invested",
  props: ["puddle", "one leaf boat"],
  mood: "Captivated",
  compose: (scene) => {
    const boat = placedAnimated(
      `translate(350 442) scale(1.35)`,
      animated(
        `${rotEllipse(0, 0, 20, 8, -4, "#D97A2B")}<line x1="2" y1="-4" x2="2" y2="-22" stroke="${CAST.woodDeep}" stroke-width="3"/>${roundedTri(
          [
            [2, -22],
            [16, -14],
            [2, -8],
          ],
          2,
          "#E8A65A",
        )}`,
        aRotate([-6, 6, -6], 0, 0, { dur: 1.8 }),
      ),
      aTranslate(
        [
          [0, 0],
          [150, 5],
          [0, 0],
        ],
        { dur: 8 },
      ),
    );
    return {
      behind:
        homeFar(scene) +
        treeFar(scene) +
        `<ellipse cx="425" cy="448" rx="125" ry="17" fill="${CAST.blue}" opacity="0.4"/>` +
        boat,
      fox: foxSitting({ expr: "curious", scarf: scarfFor(scene), lean: 7, pupilDx: -7, pupilDy: 6 }),
      foxScale: 0.95,
    };
  },
};

const snowman: ActivityDef = {
  id: "snowman",
  title: "Snowman Friend",
  pose: "patting the snowman into shape",
  props: ["snowman", "carrot nose", "two scarves"],
  mood: "Crafty",
  compose: (scene) => {
    const sm = `<g transform="translate(392 ${GROUND_Y + 18})">
      <circle cx="0" cy="-46" r="52" fill="#FFFFFF"/>
      <circle cx="0" cy="-118" r="38" fill="#FFFFFF"/>
      <circle cx="0" cy="-172" r="26" fill="#FFFFFF"/>
      <circle cx="-8" cy="-178" r="3.5" fill="${CAST.charcoal}"/><circle cx="10" cy="-178" r="3.5" fill="${CAST.charcoal}"/>
      ${roundedTri(
        [
          [0, -172],
          [22, -166],
          [0, -164],
        ],
        2,
        "#E8883B",
      )}
      <path d="M -8 -160 Q 2 -154 12 -160" stroke="${CAST.charcoal}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <rect x="-30" y="-152" width="60" height="12" rx="6" fill="${CAST.magenta}"/>
      <line x1="-36" y1="-120" x2="-70" y2="-142" stroke="${CAST.wood}" stroke-width="5" stroke-linecap="round"/>
      <line x1="36" y1="-120" x2="72" y2="-138" stroke="${CAST.wood}" stroke-width="5" stroke-linecap="round"/>
    </g>`;
    return {
      behind: house(120, 398, 0.8, { lit: true, snowRoof: true, night: isNight(scene) }) + sm,
      fox: foxSitting({
        expr: "happy",
        scarf: "tied",
        armL: { angle: 76, len: 90, anim: aRotate([-9, 7, -9], -36, -70, { dur: 1.5 }) },
      }),
      foxX: 560,
    };
  },
};

const flakeCatch: ActivityDef = {
  id: "flakeCatch",
  title: "Snowflake Catch",
  pose: "one paw up, tongue-out concentration",
  props: ["falling snow", "footprints"],
  mood: "Playful",
  compose: (scene) => {
    const prints = [
      [700, 442],
      [664, 452],
      [716, 462],
      [676, 472],
    ]
      .map(([px, py]) => `<ellipse cx="${px}" cy="${py}" rx="9" ry="5" fill="${CAST.charcoal}" opacity="0.15"/>`)
      .join("");
    return {
      behind: homeFar(scene) + treeFar(scene) + prints,
      fox: foxSitting({
        expr: "happy",
        scarf: "tied",
        armL: { angle: 118, len: 90 },
        pupilDx: -4,
        pupilDy: -6,
      }),
    };
  },
};

const skating: ActivityDef = {
  id: "skating",
  title: "Pond Skating",
  pose: "gliding across the frozen pond, tail as rudder",
  props: ["frozen pond", "breath puffs"],
  mood: "Graceful",
  compose: (scene) => {
    const puff = (begin: number) =>
      `<g opacity="0">${animated(
        `<circle cx="-64" cy="-198" r="7" fill="#FFFFFF"/>`,
        aTranslate(
          [
            [0, 0],
            [-22, -10],
          ],
          { dur: 1.8, begin, ease: false },
        ),
      )}${aOpacity([0, 0.55, 0], { dur: 1.8, begin, ease: false })}</g>`;
    return {
      behind: homeFar(scene) + treeFar(scene) + pond(480, GROUND_Y + 34, 240, true),
      fox: foxSitting({ expr: "happy", scarf: "streaming", tailStreaming: true, held: puff(0) + puff(-0.9) }),
      foxX: 480,
      foxY: 444,
      foxScale: 0.9,
      foxAnims: [
        aTranslate(
          [
            [-105, 0],
            [105, 0],
            [-105, 0],
          ],
          { dur: 7 },
        ),
        aRotate([5, -5, 5], 0, -60, { dur: 7 }),
      ],
      noShadow: true,
    };
  },
};

const stargaze: ActivityDef = {
  id: "stargaze",
  title: "Stargazing",
  pose: "one eye to the telescope, ears on alert",
  props: ["telescope", "shooting star"],
  mood: "Wonderstruck",
  compose: (scene) => {
    const telescope = `<g transform="translate(400 ${GROUND_Y + 6})">
      <line x1="-34" y1="0" x2="0" y2="-156" stroke="${CAST.wood}" stroke-width="6" stroke-linecap="round"/>
      <line x1="34" y1="0" x2="0" y2="-156" stroke="${CAST.wood}" stroke-width="6" stroke-linecap="round"/>
      <line x1="4" y1="0" x2="0" y2="-156" stroke="${CAST.wood}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
      <g transform="translate(0 -170) rotate(-35)">
        <rect x="-58" y="-13" width="112" height="26" rx="13" fill="${CAST.charcoal}"/>
        <rect x="-58" y="-13" width="20" height="26" rx="10" fill="${CAST.purple}"/>
        <rect x="44" y="-9" width="16" height="18" rx="8" fill="${CAST.magenta}"/>
      </g>
    </g>`;
    return {
      behind: homeFar(scene, { lit: true }) + treeFar(scene) + telescope,
      fox: foxSitting({ expr: "curious", scarf: scarfFor(scene), lean: -10, pupilDx: -7, pupilDy: 2 }),
      foxX: 592,
      foxScale: 0.95,
      front: shootingStar(),
    };
  },
};

const sleep: ActivityDef = {
  id: "sleep",
  title: "Fast Asleep",
  pose: "a perfect crescent of fox",
  props: ["Zzz", "fireflies (in season)"],
  mood: "Asleep",
  compose: (scene) => ({
    behind: homeFar(scene, { lit: true }) + treeFar(scene),
    fox: foxCurled({ expr: "sleepy", scarf: scarfFor(scene) }),
    shadowRx: 100,
    front: zzz(636, 262) + (scene.season === "summer" ? fireflies() : ""),
  }),
};

const goldenHour: ActivityDef = {
  id: "goldenHour",
  title: "Golden Hour",
  pose: "sitting very still so the sunset lasts longer",
  props: ["sunset", "passing birds"],
  mood: "Content",
  compose: (scene) => ({
    behind: homeFar(scene) + treeFar(scene),
    fox: foxSitting({ expr: "content", scarf: scarfFor(scene) }),
    front:
      `<rect x="0" y="0" width="${W}" height="490" fill="#FF9A5C" opacity="0">${aOpacity([0, 0.1, 0], { dur: 7 })}</rect>` +
      birds(140, 26),
  }),
};

const lantern: ActivityDef = {
  id: "lantern",
  title: "Lantern Walk",
  pose: "lantern held out into the fog",
  props: ["glowing lantern"],
  mood: "Intrepid",
  compose: (scene) => {
    const lamp = `<g transform="rotate(-88 -36 -14)">
      <line x1="-36" y1="-20" x2="-36" y2="-8" stroke="${CAST.charcoal}" stroke-width="4"/>
      <rect x="-53" y="-8" width="34" height="42" rx="7" fill="${CAST.charcoal}"/>
      <rect x="-47" y="-1" width="22" height="28" rx="5" fill="${CAST.yellow}">${aOpacity([0.85, 1, 0.85], { dur: 2.2 })}</rect>
      <circle cx="-36" cy="13" r="40" fill="${CAST.yellow}" opacity="0.3">${aOpacity([0.22, 0.4, 0.22], { dur: 2.2 })}</circle>
    </g>`;
    return {
      behind: homeFar(scene, { lit: true }) + treeFar(scene),
      fox: foxSitting({
        expr: "open",
        scarf: "tied",
        armL: { angle: 88, len: 74, extra: lamp },
        pupilDx: -5,
      }),
      front: `<circle cx="482" cy="408" r="76" fill="${CAST.yellow}" opacity="0.12">${aOpacity([0.08, 0.18, 0.08], { dur: 2.2 })}</circle>`,
    };
  },
};

const puddleJump: ActivityDef = {
  id: "puddleJump",
  title: "Puddle Jumping",
  pose: "mid-hop, all four boots off the ground",
  props: ["rain boots", "one big puddle"],
  mood: "Gleeful",
  compose: (scene) => {
    const dur = 2.6;
    const land = 0.72;
    const boots = `
      <rect x="-56" y="-38" width="38" height="38" rx="11" fill="${CAST.purple}"/>
      <rect x="-56" y="-38" width="38" height="9" rx="4.5" fill="${CAST.magenta}"/>
      <rect x="-22" y="-38" width="38" height="38" rx="11" fill="${CAST.purple}"/>
      <rect x="-22" y="-38" width="38" height="9" rx="4.5" fill="${CAST.magenta}"/>`;
    const hop = aTranslate(
      [
        [0, 0],
        [0, 0],
        [0, -64],
        [0, 0],
        [0, 0],
      ],
      { dur, keyTimes: [0, 0.35, 0.55, land, 1] },
    );
    const ring = (r0: number, r1: number) =>
      `<ellipse cx="585" cy="466" rx="${r0}" ry="${(r0 / 7).toFixed(1)}" fill="none" stroke="#CFE6FF" stroke-width="4" opacity="0">
        ${aAttr("rx", [r0, r0, r1], { dur, keyTimes: [0, land, 1], ease: false })}
        ${aAttr("ry", [(r0 / 7).toFixed(1), (r0 / 7).toFixed(1), (r1 / 7).toFixed(1)], { dur, keyTimes: [0, land, 1], ease: false })}
        ${aOpacity([0, 0, 0.85, 0], { dur, keyTimes: [0, land - 0.02, land + 0.02, 1], ease: false })}
      </ellipse>`;
    const drop = (dx: number, dy: number) =>
      `<circle cx="585" cy="458" r="4" fill="#CFE6FF" opacity="0">
        ${aTranslate(
          [
            [0, 0],
            [0, 0],
            [dx * 0.6, dy],
            [dx, 0],
            [dx, 0],
          ],
          { dur, keyTimes: [0, land, land + 0.12, land + 0.26, 1], ease: false },
        )}
        ${aOpacity([0, 0, 0.9, 0.9, 0], { dur, keyTimes: [0, land - 0.01, land + 0.02, land + 0.2, 1], ease: false })}
      </circle>`;
    return {
      behind:
        homeFar(scene) +
        treeFar(scene) +
        `<ellipse cx="585" cy="468" rx="128" ry="16" fill="${CAST.blue}" opacity="0.42"/>`,
      fox: foxSitting({ expr: "happy", scarf: scarfFor(scene), earL: 6, earR: 12, pupilDy: 4, held: boots }),
      foxAnims: [hop],
      shadowRx: 96,
      front: ring(30, 120) + ring(20, 90) + drop(-48, -40) + drop(52, -34) + drop(-30, -56) + drop(34, -50),
    };
  },
};

const campfire: ActivityDef = {
  id: "campfire",
  title: "Campfire",
  pose: "sitting close, marshmallow stick out over the flames",
  props: ["crackling fire", "rising sparks", "a marshmallow"],
  mood: "Toasty",
  compose: (scene, ip) => {
    const stick = `
      <line x1="-36" y1="-14" x2="-36" y2="62" stroke="${CAST.wood}" stroke-width="4" stroke-linecap="round"/>
      <rect x="-45" y="56" width="18" height="18" rx="6" fill="${CAST.cream}" stroke="#E8A65A" stroke-width="2.5"/>`;
    const spark = (x: number, dx: number, dur: number, begin: number) =>
      `<g opacity="0">${animated(
        `<circle cx="${x}" cy="-72" r="3" fill="${CAST.yellow}"/>`,
        aTranslate(
          [
            [0, 0],
            [dx, -96],
          ],
          { dur, begin, ease: false },
        ),
      )}${aOpacity([0, 0.9, 0], { dur, begin, ease: false })}</g>`;
    const flames = animated(
      `<path d="M -26 -10 Q -32 -50 0 -86 Q 32 -50 26 -10 Z" fill="#FF7A3D"/>
       <path d="M -15 -10 Q -20 -42 0 -62 Q 20 -42 15 -10 Z" fill="${CAST.yellow}"/>
       <path d="M -7 -10 Q -9 -28 0 -38 Q 9 -28 7 -10 Z" fill="${CAST.cream}" opacity="0.9"/>`,
      aScale(
        [
          [1, 1],
          [1.06, 0.94],
          [0.95, 1.07],
          [1, 1],
        ],
        { dur: 0.9 },
      ),
    );
    const stones = [-46, -30, -12, 8, 26, 44]
      .map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 4 : 1}" r="7" fill="#8B8FA0"/>`)
      .join("");
    const fire = `<g transform="translate(430 ${GROUND_Y + 62})">
      <circle cx="0" cy="-34" r="150" fill="url(#${ip}glow)" opacity="0.7">${aOpacity([0.55, 0.85, 0.55], { dur: 1.3 })}</circle>
      ${stones}
      ${rotEllipse(-14, -8, 34, 8, -18, CAST.wood)}
      ${rotEllipse(14, -8, 34, 8, 18, CAST.woodDeep)}
      <g transform="translate(0 -6)">${flames}</g>
      ${spark(-6, 8, 1.8, 0)}${spark(6, -10, 2.1, -0.7)}${spark(0, 4, 1.6, -1.3)}
    </g>`;
    return {
      behind: homeFar(scene, { lit: true }) + treeFar(scene) + fire,
      fox: foxSitting({
        expr: "content",
        scarf: scarfFor(scene),
        armL: { angle: 100, len: 70, extra: stick },
        pupilDx: -6,
        pupilDy: 3,
      }),
      front: `<circle cx="540" cy="390" r="170" fill="url(#${ip}glow)" opacity="0.35">${aOpacity([0.25, 0.45, 0.25], { dur: 1.3 })}</circle>`,
    };
  },
};

// --- Daily rhythm scenes ----------------------------------------------------

const WAKE_DUR = 18;

const wakeUp: ActivityDef = {
  id: "wakeUp",
  title: "Rise and Shine",
  pose: "porch sleeper → full-body stretch → upright fox",
  props: ["porch", "Zzz", "one enormous yawn"],
  mood: "Booting",
  compose: (scene) => {
    const sleeping = atPorch(foxCurled({ expr: "sleepy", scarf: scarfFor(scene) })) + zzz(468, 330);
    const stretch = atPorch(
      foxSitting({
        expr: "yawn",
        scarf: scarfFor(scene),
        armL: { angle: 152, len: 80 },
        armR: { angle: -152, len: 80 },
      }),
    );
    const settled = atPorch(foxSitting({ expr: "content", scarf: scarfFor(scene) }));
    return {
      behind:
        porchStage(scene) +
        PORCH_SHADOW +
        during(sleeping, WAKE_DUR, 0, 0.42) +
        during(stretch, WAKE_DUR, 0.42, 0.68) +
        during(settled, WAKE_DUR, 0.68, 1),
      front: birds(150, 24),
      noShadow: true,
    };
  },
};

const breakfast: ActivityDef = {
  id: "breakfast",
  title: "Porch Breakfast",
  pose: "on the porch step, spoon in paw, bowl within reach",
  props: ["oatmeal bowl", "wooden stool", "steam"],
  mood: "Fueling",
  compose: (scene) => {
    const stool = `<g transform="translate(386 ${GROUND_Y + 24})">
      <rect x="-27" y="-42" width="54" height="9" rx="4.5" fill="${CAST.wood}"/>
      <line x1="-18" y1="-33" x2="-24" y2="0" stroke="${CAST.woodDeep}" stroke-width="5" stroke-linecap="round"/>
      <line x1="18" y1="-33" x2="24" y2="0" stroke="${CAST.woodDeep}" stroke-width="5" stroke-linecap="round"/>
    </g>`;
    const bowl = `<g transform="translate(386 ${GROUND_Y - 18})">
      <path d="M -21 0 a 21 15 0 0 0 42 0 Z" fill="${CAST.blue}"/>
      <ellipse cx="0" cy="0" rx="21" ry="6" fill="#F6E7C8"/>
    </g>${steam(386, GROUND_Y - 30)}`;
    const spoon = `
      <line x1="-36" y1="-22" x2="-36" y2="18" stroke="${CAST.woodDeep}" stroke-width="6.5" stroke-linecap="round"/>
      <ellipse cx="-36" cy="24" rx="9" ry="6.5" fill="${CAST.cream}" stroke="${CAST.woodDeep}" stroke-width="2.5"/>`;
    return {
      behind: porchStage(scene) + PORCH_SHADOW + stool + bowl,
      fox: foxSitting({
        expr: "content",
        scarf: scarfFor(scene),
        armL: { angle: 56, len: 76, anim: aRotate([0, -22, 0], -36, -70, { dur: 2.6 }), extra: spoon },
        pupilDx: -5,
        pupilDy: 4,
      }),
      foxX: 455,
      foxY: 452,
      foxScale: 0.72,
      noShadow: true,
    };
  },
};

const lunch: ActivityDef = {
  id: "lunch",
  title: "Lunch O'Clock",
  pose: "at the stump table, sandwich halfway to destination",
  props: ["stump table", "sandwich", "dessert apple"],
  mood: "Peckish",
  compose: (scene) => {
    const table = `<g transform="translate(362 ${GROUND_Y + 16})">
      <rect x="-40" y="-44" width="80" height="44" fill="${CAST.wood}"/>
      <ellipse cx="0" cy="-44" rx="46" ry="13" fill="#C9A05E"/>
      <ellipse cx="0" cy="-44" rx="46" ry="13" fill="none" stroke="${CAST.woodDeep}" stroke-width="3"/>
      <ellipse cx="0" cy="-44" rx="25" ry="7" fill="none" stroke="${CAST.woodDeep}" stroke-width="2" opacity="0.4"/>
      <ellipse cx="0" cy="-44" rx="9" ry="2.8" fill="none" stroke="${CAST.woodDeep}" stroke-width="2" opacity="0.4"/>
    </g>`;
    const plate = `<g transform="translate(348 ${GROUND_Y - 30})">
      <ellipse cx="0" cy="0" rx="25" ry="7.5" fill="#FFFFFF"/>
      <rect x="-15" y="-9" width="30" height="6" rx="3" fill="#F0D08C"/>
      <rect x="-13" y="-4" width="26" height="4" fill="${CAST.leafGreen}"/>
    </g><circle cx="390" cy="${GROUND_Y - 36}" r="8" fill="#E5484D"/><line x1="390" y1="${GROUND_Y - 44}" x2="393" y2="${GROUND_Y - 49}" stroke="${CAST.woodDeep}" stroke-width="2.5" stroke-linecap="round"/>`;
    // Counter-rotated so the sandwich stays level while the arm is raised.
    const sandwich = `<g transform="rotate(-100 -4 -8) translate(-4 -6)">
      <rect x="-20" y="-13" width="40" height="9" rx="4.5" fill="#F0D08C"/>
      <rect x="-18" y="-5" width="36" height="4" fill="${CAST.leafGreen}"/>
      <rect x="-19" y="-2" width="38" height="4" rx="2" fill="${CAST.magenta}" opacity="0.85"/>
      <rect x="-20" y="2" width="40" height="9" rx="4.5" fill="#F0D08C"/>
    </g>`;
    return {
      behind: homeFar(scene) + treeFar(scene) + table + plate,
      fox: foxSitting({
        expr: "happy",
        scarf: scarfFor(scene),
        armR: {
          angle: 100,
          anim: aRotate([0, 38, 38, 0], -4, -70, { dur: 3.6, keyTimes: [0, 0.3, 0.6, 1] }),
          extra: sandwich,
        },
      }),
      foxX: 540,
      foxScale: 0.95,
      foxAnims: [
        aTranslate(
          [
            [0, 0],
            [0, -4],
            [0, 0],
          ],
          { dur: 3.6 },
        ),
      ],
    };
  },
};

const BED_DUR = 20;

const bedtime: ActivityDef = {
  id: "bedtime",
  title: "Off to Bed",
  pose: "candle-lit yawn by the door → curled up for the night",
  props: ["candle", "lit doorway", "Zzz"],
  mood: "Winding down",
  compose: (scene) => {
    const flame = animated(
      `${rotEllipse(-36, -46, 6, 11, 0, CAST.yellow)}<ellipse cx="-36" cy="-43" rx="3" ry="5" fill="#FFF6D8"/>`,
      aTranslate(
        [
          [0, 0],
          [0, -2],
          [0, 0],
        ],
        { dur: 0.9 },
      ),
    );
    const candle = `<g transform="rotate(-76 -36 -12)">
      <rect x="-46" y="-34" width="20" height="28" rx="5" fill="${CAST.cream}"/>
      ${flame}
      <circle cx="-36" cy="-44" r="30" fill="${CAST.yellow}" opacity="0.22">${aOpacity([0.14, 0.28, 0.14], { dur: 1.6 })}</circle>
    </g>`;
    const yawning = atPorch(
      foxSitting({ expr: "yawn", scarf: scarfFor(scene), armL: { angle: 76, len: 76, extra: candle } }),
    );
    const asleep = atPorch(foxCurled({ expr: "sleepy", scarf: scarfFor(scene) })) + zzz(468, 330);
    return {
      behind:
        porchStage(scene, { lit: true }) +
        PORCH_SHADOW +
        during(yawning, BED_DUR, 0, 0.52) +
        during(asleep, BED_DUR, 0.52, 1),
      front: scene.season === "summer" ? fireflies() : "",
      noShadow: true,
    };
  },
};

/** Sun after recent rain — also the "rainbow" easter egg in the location search. */
const rainbow: ActivityDef = {
  id: "rainbow",
  title: "Rainbow's End",
  pose: "sitting back on the hill, eyes on the arc",
  props: ["one freshly rinsed rainbow"],
  mood: "Enchanted",
  compose: (scene) => ({
    farBehind: rainbowArc(),
    behind: homeFar(scene) + treeFar(scene),
    fox: foxSitting({ expr: "surprised", pupilDx: -6, pupilDy: -8 }),
    foxX: 600,
    foxScale: 0.8,
    shadowRx: 100,
    front: butterfly(300, 280) + birds(150, 24),
  }),
};

/**
 * Easter egg: Cast escanciando sidra under the orbayu. Never picked by the
 * selection matrix — only reachable by searching for Asturias or Oviedo.
 */
const cider: ActivityDef = {
  id: "cider",
  title: "Escanciando",
  pose: "bottle arm high, glass arm low, eyes forward — proper form",
  props: ["a bottle of sidra", "one wide glass", "orbayu"],
  mood: "Asturian",
  compose: (scene, ip) => {
    // Green sidra bottle drawn after the fox so it reads as held in front of
    // the face: gripped at the raised paw, tipped so the mouth clears the head.
    const bottle = `<g transform="translate(-58 -148) rotate(-25)">
      <rect x="-10" y="-66" width="20" height="62" rx="9" fill="#2E5B3C"/>
      <rect x="-5" y="-88" width="10" height="26" rx="5" fill="#2E5B3C"/>
      <rect x="-7" y="-56" width="14" height="18" rx="3" fill="${CAST.cream}" opacity="0.9"/>
    </g>`;
    // Wide sidra glass in the other paw. The outer group cancels the arm's
    // 88° so the frame is level; inside it the glass tilts 30° around its
    // base and slides out so its LOWER rim edge sits under the pour (proper
    // form: the stream hits the low lip and runs down the wall). The culín
    // stays level, drawn as a horizontal rect clipped to the tilted glass.
    const glassShape = `<rect x="-19" y="-32" width="30" height="40" rx="5" transform="rotate(-30 -4 8)"/>`;
    const glass = `<g transform="rotate(-88 -4 10)"><g transform="translate(24 0)">
      <clipPath id="${ip}culin">${glassShape}</clipPath>
      <g fill="#FFFFFF" opacity="0.55">${glassShape}</g>
      <rect x="-44" y="-8" width="64" height="30" fill="#F5C84C" opacity="0.92" clip-path="url(#${ip}culin)"/>
    </g></g>`;
    // The pour falls straight down from the mouth onto the lower rim edge.
    const stream = `<g>
      ${animated(
        `<path d="M -95 -222 L -93 -98" stroke="#F5C84C" stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.85"/>`,
        aTranslate(
          [
            [0, 0],
            [2.5, 0],
            [0, 0],
          ],
          { dur: 1.1 },
        ),
      )}
      ${animated(
        `<circle cx="-87" cy="-101" r="2.6" fill="#F5C84C"/><circle cx="-101" cy="-94" r="2" fill="#F5C84C"/>`,
        aOpacity([0.9, 0.3, 0.9], { dur: 0.9 }),
      )}
    </g>`;
    const barrel = `<g transform="translate(385 ${GROUND_Y + 44})">
      <rect x="-30" y="-64" width="60" height="64" rx="12" fill="${CAST.wood}"/>
      <rect x="-32" y="-52" width="64" height="7" rx="3.5" fill="${CAST.woodDeep}"/>
      <rect x="-32" y="-24" width="64" height="7" rx="3.5" fill="${CAST.woodDeep}"/>
      <ellipse cx="0" cy="-64" rx="30" ry="8" fill="${CAST.woodDeep}"/>
    </g>`;
    return {
      behind: homeFar(scene) + appleTree(268, GROUND_Y + 4, 1.45, scene.season, { apples: true }) + barrel,
      fox:
        foxSitting({
          expr: "determined",
          armL: { angle: 165, len: 84 },
          armR: { angle: 88, len: 88, extra: glass },
        }) +
        bottle +
        stream,
      foxScale: 0.88,
    };
  },
};

/**
 * Easter egg: Cast summons his launcher and runs his favorite command.
 * Never picked by the selection matrix — only by searching for "raycast".
 */
const raycast: ActivityDef = {
  id: "raycast",
  title: "Confetti!",
  pose: "both paws in the air under the falling confetti",
  props: ["a floating command palette", "the one command that matters"],
  mood: "Celebrating",
  compose: (scene) => {
    const row = (y: number, label: string, iconFill: string, highlight: boolean) =>
      `${highlight ? `<rect x="152" y="${y - 17}" width="296" height="34" rx="9" fill="${CAST.fur}" opacity="0.32"/>` : ""}
       <circle cx="172" cy="${y}" r="8" fill="${iconFill}"/>
       <text x="192" y="${y + 5.5}" font-family="${FONT}" font-size="16" fill="${highlight ? "#FFFFFF" : "#B9B2C4"}">${label}</text>
       ${highlight ? `<text x="428" y="${y + 5.5}" font-family="${FONT}" font-size="15" fill="#FFFFFF" opacity="0.7">↵</text>` : ""}`;
    const palette = placedAnimated(
      "translate(110 40)",
      `<ellipse cx="300" cy="336" rx="200" ry="26" fill="${CAST.fur}" opacity="0.10"/>
       <rect x="140" y="118" width="320" height="196" rx="16" fill="#1F1A28" opacity="0.97" stroke="#3A3344" stroke-width="2"/>
       <text x="162" y="152" font-family="${FONT}" font-size="17" fill="#FFFFFF">confetti</text>
       ${animated(`<rect x="228" y="137" width="2.5" height="19" fill="${CAST.fur}"/>`, aOpacity([1, 1, 0, 0], { dur: 1.1, keyTimes: [0, 0.5, 0.5, 1], ease: false }))}
       <line x1="140" y1="166" x2="460" y2="166" stroke="#3A3344" stroke-width="2"/>
       ${row(192, "Confetti", CAST.magenta, true)}
       ${row(228, "Weather", CAST.yellow, false)}
       ${row(264, "Cast's World", CAST.fur, false)}
       <line x1="140" y1="284" x2="460" y2="284" stroke="#3A3344" stroke-width="1.5"/>
       <text x="152" y="303" font-family="${FONT}" font-size="12" fill="#7A7288">Open Command</text>`,
      aTranslate(
        [
          [0, 0],
          [0, -8],
          [0, 0],
        ],
        { dur: 5 },
      ),
    );
    const rand = mulberry(93);
    const colors = [CAST.fur, CAST.yellow, CAST.magenta, CAST.purple, CAST.blue, CAST.cyan, CAST.leafGreen];
    const band = 420;
    let pieces = "";
    for (let i = 0; i < 16; i++) {
      const x = 24 + rand() * (W - 48);
      const y = 10 + rand() * band;
      const c = colors[i % colors.length];
      const a = Math.round(rand() * 180 - 90);
      const piece = `<rect x="${(x - 5).toFixed(0)}" y="${(y - 3).toFixed(0)}" width="10" height="6" rx="1.5" fill="${c}" transform="rotate(${a} ${x.toFixed(0)} ${y.toFixed(0)})"/>
        <rect x="${(x - 5).toFixed(0)}" y="${(y - 3 - band).toFixed(0)}" width="10" height="6" rx="1.5" fill="${c}" transform="rotate(${a} ${x.toFixed(0)} ${(y - band).toFixed(0)})"/>`;
      pieces += animated(
        piece,
        aTranslate(
          [
            [0, 0],
            [14 + rand() * 10, 0],
            [0, 0],
          ],
          { dur: 1.8 + rand() * 1.6, begin: -rand() * 3 },
        ),
      );
    }
    const confetti = animated(pieces, aTranslateLinear([0, 0], [0, band], 4.6));
    return {
      behind: homeFar(scene) + palette,
      fox: foxSitting({
        expr: "happy",
        armL: { angle: 150, len: 76 },
        armR: { angle: -150, len: 76 },
      }),
      foxX: 620,
      foxScale: 0.9,
      front: confetti,
    };
  },
};

// ---------------------------------------------------------------------------
// Registry & selection
// ---------------------------------------------------------------------------

export const ACTIVITIES: Record<CastScene["activity"], ActivityDef> = {
  sit,
  nap,
  windowWatch,
  porchCocoa,
  porchCoffee,
  raking,
  picnic,
  applePicking,
  painting,
  gardening,
  hideSeek,
  cloudWatch,
  umbrella,
  kite,
  hike,
  lemonade,
  leafBoat,
  snowman,
  flakeCatch,
  skating,
  stargaze,
  sleep,
  goldenHour,
  lantern,
  wakeUp,
  breakfast,
  lunch,
  bedtime,
  puddleJump,
  campfire,
  rainbow,
  cider,
  raycast,
};

type Activity = CastScene["activity"];

/** Which activities fit the given conditions; never empty. */
export function candidateActivities(c: SceneConditions): Activity[] {
  const { phase } = c;
  const night = phase === "night";

  // Overrides: transient events that should win outright.
  if (c.hazy) return ["windowWatch"];
  if (c.afterRain && !night) return ["rainbow"];
  if (c.icy) return night ? ["windowWatch"] : ["windowWatch", "porchCocoa"];

  if (phase === "sunrise" && isSheltered(c)) return ["wakeUp", "breakfast", "porchCoffee"];
  return baseCandidates(c);
}

/** Storms and blizzards rule out even the porch scenes. */
function isSheltered(c: SceneConditions): boolean {
  const blizzard = c.weather === "snow" && c.windy;
  return c.weather !== "storm" && c.weather !== "heavyRain" && !blizzard;
}

/**
 * The daily routine scene for this hour, if any. Kept separate from the
 * candidate pool so the caller can apply it as an override: the porch scenes
 * are sheltered and work in any weather short of a storm; lunch is outdoors
 * and stays dry-weather only. Transient overrides (haze, rainbow, ice) win.
 */
export function routineActivity(c: SceneConditions): Activity | undefined {
  const { weather, phase, hour } = c;
  if (hour === undefined || c.hazy || c.icy || (c.afterRain && phase !== "night") || !isSheltered(c)) return undefined;
  if (phase === "night" && (hour >= 20 || hour <= 1)) return "bedtime";
  if (phase === "day" && hour >= 6 && hour <= 9) return "breakfast";
  if (phase === "day" && hour >= 11 && hour <= 13 && ["clear", "partly", "cloudy"].includes(weather)) return "lunch";
  return undefined;
}

function baseCandidates(c: SceneConditions): Activity[] {
  const { weather, phase, season, feel, windy } = c;
  const night = phase === "night";
  const cold = feel === "cold";
  const hot = feel === "hot";
  const warmSeason = season === "spring" || season === "summer";
  // Campfires suit dry nights that aren't sweltering.
  const fireNight: Activity[] = hot ? [] : ["campfire"];

  switch (weather) {
    case "storm":
      return night ? ["porchCocoa", "windowWatch", "sleep"] : ["porchCocoa", "windowWatch"];
    case "heavyRain":
      return night ? ["windowWatch", "sleep", "porchCocoa"] : ["windowWatch", "porchCocoa"];
    case "rain":
      if (windy) return ["windowWatch", "porchCocoa"];
      if (night) return ["windowWatch", "porchCocoa", "sleep"];
      return cold ? ["umbrella", "windowWatch", "porchCocoa"] : ["umbrella", "puddleJump", "windowWatch"];
    case "drizzle":
      if (night) return ["umbrella", "windowWatch"];
      if (cold || season === "winter") return ["umbrella", "windowWatch"];
      return ["leafBoat", "umbrella", "puddleJump"];
    case "snow":
      if (windy) return ["windowWatch", "porchCocoa"];
      return night ? ["flakeCatch", "sleep", "windowWatch"] : ["snowman", "flakeCatch"];
    case "fog":
      return night ? ["lantern", "sleep"] : ["lantern", "sit", "hike"];
    case "wind":
      if (night) return ["sit", "windowWatch"];
      if (season === "autumn") return ["kite", "raking"];
      return cold ? ["kite", "sit"] : ["kite"];
    case "cloudy": {
      if (night) return ["sleep", "windowWatch", ...fireNight];
      const list: Activity[] = ["painting", "nap"];
      if (season === "autumn") list.push("raking");
      if (hot) list.push("lemonade");
      if (!cold) list.push("hike");
      return list;
    }
    case "partly": {
      if (night) return ["stargaze", "sleep", ...fireNight];
      if (phase === "sunset") return ["goldenHour"];
      const list: Activity[] = ["cloudWatch", "painting"];
      if (hot) list.push("lemonade");
      if (!cold && warmSeason) list.push("picnic", "hideSeek");
      if (season === "autumn") list.push("applePicking");
      if (cold) list.push("hike", "sit");
      return list;
    }
    default: {
      // clear
      if (phase === "sunset") return ["goldenHour"];
      if (night) return ["stargaze", "sleep", ...fireNight];
      if (hot) return ["lemonade"];
      switch (season) {
        case "winter":
          return cold ? ["skating", "hike", "sit"] : ["hike", "sit"];
        case "spring":
          return cold ? ["hike", "sit", "gardening"] : ["gardening", "picnic", "hideSeek", "hike"];
        case "summer":
          return cold ? ["hike", "sit"] : ["picnic", "hike", "hideSeek", "gardening"];
        default:
          return cold ? ["applePicking", "hike", "raking"] : ["applePicking", "hike", "raking", "picnic"];
      }
    }
  }
}
