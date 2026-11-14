import { levelBriefing } from "./level";
import { type LevelState, type Point } from "./types";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function renderLightBurst(
  origin: { x: number; y: number },
  t: number,
  width: number,
  height: number,
  startRadius: number,
): string {
  const ease = easeOutCubic(t);
  const maxR = Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) + 48;
  const washR = startRadius + (maxR - startRadius) * ease;
  const flashOp = t < 0.16 ? (t / 0.16) * 0.9 : Math.max(0, 1 - (t - 0.16) / 0.28) * 0.55;
  const washOp = (t < 0.35 ? 0.22 + t * 0.5 : (1 - t) * 0.55) * 0.9;

  const rings = [0, 0.12, 0.26]
    .map((delay, i) => {
      const rt = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
      if (rt <= 0) return "";
      const rr = startRadius + (maxR - startRadius) * easeOutCubic(rt);
      const op = (1 - rt) * (i === 0 ? 0.85 : 0.55);
      const color = i === 0 ? "#fff4c2" : i === 1 ? "#ffd43b" : "#ffa94d";
      return `<circle cx="${origin.x}" cy="${origin.y}" r="${rr}" fill="none" stroke="${color}" stroke-width="${3.5 - i}" opacity="${op}"/>`;
    })
    .join("");

  const sparkCount = 14;
  const sparks = Array.from({ length: sparkCount }, (_, i) => {
    const angle = (i / sparkCount) * Math.PI * 2 + t * 0.55;
    const inner = 10 + t * 18;
    const outer = 28 + ease * maxR * 0.62;
    const x1 = origin.x + Math.cos(angle) * inner;
    const y1 = origin.y + Math.sin(angle) * inner;
    const x2 = origin.x + Math.cos(angle) * outer;
    const y2 = origin.y + Math.sin(angle) * outer;
    const tipX = origin.x + Math.cos(angle) * (outer + 6);
    const tipY = origin.y + Math.sin(angle) * (outer + 6);
    const op = Math.max(0, 1 - t) * 0.9;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffe066" stroke-width="2" stroke-linecap="round" opacity="${op}"/>
      <circle cx="${tipX}" cy="${tipY}" r="${2.4 + (1 - t) * 1.6}" fill="#fff4c2" opacity="${op}"/>`;
  }).join("");

  return `<defs>
      <radialGradient id="lightWash">
        <stop offset="0%" stop-color="#fff4c2" stop-opacity="0.95"/>
        <stop offset="35%" stop-color="#ffd43b" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#ffa94d" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${origin.x}" cy="${origin.y}" r="${washR}" fill="url(#lightWash)" opacity="${washOp}"/>
    ${rings}
    ${sparks}
    <circle cx="${origin.x}" cy="${origin.y}" r="${22 + t * 18}" fill="none" stroke="#fff4c2" stroke-width="4" opacity="${flashOp}"/>
    <circle cx="${origin.x}" cy="${origin.y}" r="${36 + t * 24}" fill="#fff4c2" opacity="${flashOp * 0.35}"/>`;
}

function renderCatchFx(origin: { x: number; y: number }, t: number, width: number, height: number): string {
  const ringR = 14 + t * 42;
  const flashOp = t < 0.18 ? (t / 0.18) * 0.5 : Math.max(0, 0.5 - (t - 0.18) * 0.9);
  const bang = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.35);
  const stars = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 + t * 2.2;
    const dist = 16 + t * 28;
    const x = origin.x + Math.cos(angle) * dist;
    const y = origin.y + Math.sin(angle) * dist;
    const r = 3.2 + (1 - t) * 2;
    return `<polygon points="${x},${y - r} ${x + r * 0.35},${y - r * 0.2} ${x + r},${y} ${x + r * 0.35},${y + r * 0.2} ${x},${y + r} ${x - r * 0.35},${y + r * 0.2} ${x - r},${y} ${x - r * 0.35},${y - r * 0.2}" fill="#ffd43b" opacity="${bang}"/>`;
  }).join("");
  return `<rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#e03131" opacity="${flashOp}"/>
    <circle cx="${origin.x}" cy="${origin.y}" r="${ringR}" fill="none" stroke="#ff6b6b" stroke-width="5" opacity="${(1 - t) * 0.95}"/>
    <circle cx="${origin.x}" cy="${origin.y}" r="${ringR * 0.62}" fill="none" stroke="#ffa94d" stroke-width="3.5" opacity="${(1 - t) * 0.75}"/>
    ${stars}
    <text x="${origin.x}" y="${origin.y - 28 - t * 10}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${22 + bang * 10}" font-weight="bold" fill="#ffffff" stroke="#c92a2a" stroke-width="3" paint-order="stroke" opacity="${bang}">GOTCHA!</text>`;
}

function renderIntroOverlay(width: number, height: number, state: LevelState, t: number): string {
  const level = state.level;
  const { mods, rank, rankColor } = levelBriefing(state);
  const tagline =
    rank === "CHAOS"
      ? "EVERYTHING AT ONCE"
      : rank === "NIGHTMARE"
        ? "SURVIVE THIS"
        : rank === "PERILOUS"
          ? "HAZARDS COLLIDE"
          : rank === "RISING"
            ? "A NEW THREAT"
            : rank === "ADVENTURE"
              ? "THE DOOR AWAITS"
              : "FIND THE EXIT";
  const overlayOp = t < 0.08 ? t / 0.08 : 1;
  const slam = Math.max(0, Math.min(1, (t - 0.02) / 0.2));
  const titleScale = 1.55 - easeOutCubic(slam) * 0.55;
  const titleOp = slam * overlayOp;
  const rankIn = Math.max(0, Math.min(1, (t - 0.18) / 0.14));
  const lineIn = Math.max(0, Math.min(1, (t - 0.24) / 0.12));
  const goIn = Math.max(0, Math.min(1, (t - 0.62) / 0.14));
  const goOp = goIn * overlayOp * (t < 1 ? 0.7 + 0.3 * Math.sin(t * 26) : 1);
  const cx = width / 2;
  const titleSize = Math.min(54, Math.max(28, Math.min(width * 0.14, height * 0.18)));
  const stackTop = height * (mods.length > 0 ? 0.24 : 0.32);
  const badgeH = 32;
  const badgeW = Math.min(108, Math.max(68, (width - 40) / Math.max(mods.length, 1) - 8));
  const gap = 8;
  const rowW = mods.length * badgeW + Math.max(0, mods.length - 1) * gap;
  const startX = cx - rowW / 2;
  const rankY = stackTop + titleSize * 0.82;
  const lineY = rankY + 34;
  const badgeY = lineY + 22;
  const goY = Math.min(height - 20, mods.length > 0 ? badgeY + badgeH + 34 : lineY + 40);
  const badges = mods
    .map((mod, i) => {
      const appear = Math.max(0, Math.min(1, (t - 0.32 - i * 0.055) / 0.14));
      const x = startX + i * (badgeW + gap);
      const y = badgeY - (1 - easeOutCubic(appear)) * 18;
      const op = appear * overlayOp;
      return `<g opacity="${op}">
        <rect x="${x}" y="${y}" width="${badgeW}" height="${badgeH}" rx="10" fill="#12141f" stroke="${mod.color}" stroke-width="2"/>
        <text x="${x + badgeW / 2}" y="${y + 21}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.min(12, badgeW * 0.13)}" font-weight="bold" fill="${mod.color}">${mod.emoji} ${mod.name}</text>
      </g>`;
    })
    .join("");
  const rankW = Math.min(200, 64 + rank.length * 12);
  const lineW = Math.min(width * 0.42, 170) * lineIn;
  return `<rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#05060c" opacity="${0.78 * overlayOp}"/>
    <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="none" stroke="${rankColor}" stroke-width="3" opacity="${0.4 * overlayOp}"/>
    <g transform="translate(${cx},${stackTop}) scale(${titleScale})" opacity="${titleOp}">
      <text x="0" y="${-titleSize * 0.2}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${titleSize * 0.28}" font-weight="bold" fill="#adb5bd" letter-spacing="8">LEVEL</text>
      <text x="0" y="${titleSize * 0.62}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${titleSize}" font-weight="bold" fill="#ffffff">${level}</text>
    </g>
    <g opacity="${rankIn * overlayOp}">
      <rect x="${cx - rankW / 2}" y="${rankY}" width="${rankW}" height="24" rx="12" fill="${rankColor}"/>
      <text x="${cx}" y="${rankY + 16}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#120c0c" letter-spacing="2.5">${rank}</text>
    </g>
    <line x1="${cx - lineW / 2}" y1="${lineY}" x2="${cx + lineW / 2}" y2="${lineY}" stroke="#ffd43b" stroke-width="2" opacity="${0.9 * overlayOp}"/>
    <text x="${cx}" y="${lineY + 14}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="bold" fill="#ffd43b" letter-spacing="2" opacity="${lineIn * overlayOp}">${tagline}</text>
    ${badges}
    <text x="${cx}" y="${goY}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.min(18, width * 0.055)}" font-weight="bold" fill="#ffd43b" opacity="${goOp}" letter-spacing="2">PRESS ENTER</text>`;
}

export function renderMazeSvg(
  state: LevelState,
  maxDisplayWidth = 640,
  view?: {
    player?: Point;
    guard?: Point | null;
    playerScale?: number;
    guardScale?: number;
    shakeX?: number;
    catchT?: number;
    introT?: number;
  },
): string {
  const { maze, exit, key, gems, portals, trail, fogRadius, candle } = state;
  const player = view?.player ?? state.player;
  const guard = view && "guard" in view ? view.guard : state.guard;
  const won = state.finishedAt !== null;
  const rows = maze.length;
  const cols = maze[0].length;
  const cell = 36;
  const pad = 14;
  const width = cols * cell + pad * 2;
  const height = rows * cell + pad * 2;

  const cx = (x: number) => pad + x * cell;
  const cy = (y: number) => pad + y * cell;
  const center = (p: Point) => ({ x: cx(p.x) + cell / 2, y: cy(p.y) + cell / 2 });

  const bgColor = state.ice ? "#14212e" : "#191a23";
  const wallColor = state.ice ? "#a5d8ff" : state.shifting ? "#cfa96f" : "#9aa0b5";

  const wallSegments: string[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = maze[y][x];
      if (c.top) wallSegments.push(`M ${cx(x)} ${cy(y)} L ${cx(x + 1)} ${cy(y)}`);
      if (c.left) wallSegments.push(`M ${cx(x)} ${cy(y)} L ${cx(x)} ${cy(y + 1)}`);
      if (x === cols - 1 && c.right) wallSegments.push(`M ${cx(x + 1)} ${cy(y)} L ${cx(x + 1)} ${cy(y + 1)}`);
      if (y === rows - 1 && c.bottom) wallSegments.push(`M ${cx(x)} ${cy(y + 1)} L ${cx(x + 1)} ${cy(y + 1)}`);
    }
  }

  const trailDots = [...trail]
    .map(([k, visitedAt]) => {
      const [x, y] = k.split(",").map(Number);
      if ((x === exit.x && y === exit.y) || (Math.round(player.x) === x && Math.round(player.y) === y)) return "";
      const freshness = state.trailLife === null ? 1 : 1 - (state.moves - visitedAt) / state.trailLife;
      if (freshness <= 0) return "";
      return `<circle cx="${cx(x) + cell / 2}" cy="${cy(y) + cell / 2}" r="${2.4 + 1.6 * freshness}" fill="#ff9f43" opacity="${0.3 * freshness}"/>`;
    })
    .join("");

  const e = center(exit);
  const doorLocked = state.needsKey && !state.hasKey;
  const exitTile = doorLocked
    ? `<rect x="${cx(exit.x) + 5}" y="${cy(exit.y) + 5}" width="${cell - 10}" height="${cell - 10}" rx="8" fill="#3f4250" stroke="#e03131" stroke-width="1.5"/>
       <path d="M ${e.x - 4.5} ${e.y - 1} v -3.2 a 4.5 4.5 0 0 1 9 0 v 3.2" stroke="#ffd43b" stroke-width="2.4" fill="none"/>
       <rect x="${e.x - 6.5}" y="${e.y - 1}" width="13" height="10" rx="2.5" fill="#ffd43b"/>
       <circle cx="${e.x}" cy="${e.y + 3.5}" r="1.6" fill="#3f4250"/>`
    : `<rect x="${cx(exit.x) + 5}" y="${cy(exit.y) + 5}" width="${cell - 10}" height="${cell - 10}" rx="8" fill="#12b886" opacity="0.9"/>
       <text x="${e.x}" y="${e.y + 4}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="bold" fill="#0b3d2e">EXIT</text>`;

  let keySprite = "";
  if (key) {
    const k = center(key);
    keySprite = `<g transform="translate(${k.x + 2},${k.y}) rotate(-40)">
      <circle cx="0" cy="0" r="12" fill="#000000" opacity="0.35"/>
      <circle cx="-6" cy="0" r="4.2" fill="none" stroke="#ffd43b" stroke-width="3"/>
      <line x1="-1.8" y1="0" x2="9" y2="0" stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
      <line x1="5" y1="0" x2="5" y2="4.5" stroke="#ffd43b" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="9" y1="0" x2="9" y2="4.5" stroke="#ffd43b" stroke-width="2.6" stroke-linecap="round"/>
    </g>`;
  }

  const gemSprites = gems
    .map((g) => {
      const c = center(g);
      return `<g transform="translate(${c.x},${c.y})">
        <path d="M 0 -7 L 6 0 L 0 7 L -6 0 Z" fill="#3bc9db" stroke="#e3fafc" stroke-width="1.5"/>
        <path d="M 0 -7 L 6 0 L 0 0 Z" fill="#99e9f2" opacity="0.8"/>
      </g>`;
    })
    .join("");

  const portalSprites = portals
    ? portals
        .map((p) => {
          const c = center(p);
          return `<g transform="translate(${c.x},${c.y})">
            <circle r="9.5" fill="none" stroke="#4dabf7" stroke-width="2.5" opacity="0.9"/>
            <circle r="5" fill="none" stroke="#74c0fc" stroke-width="2" opacity="0.65"/>
            <circle r="1.8" fill="#a5d8ff"/>
          </g>`;
        })
        .join("")
    : "";

  let guardSprite = "";
  if (guard) {
    const g = center(guard);
    const gs = view?.guardScale ?? 1;
    guardSprite = `<g transform="translate(${g.x},${g.y}) scale(${gs})">
      <path d="M -8 6 L -8 -1 A 8 8.5 0 0 1 8 -1 L 8 6 L 5.3 3.8 L 2.7 6 L 0 3.8 L -2.7 6 L -5.3 3.8 Z" fill="#845ef7" stroke="#d0bfff" stroke-width="1.5"/>
      <circle cx="-3" cy="-1.5" r="2.4" fill="#ffffff"/>
      <circle cx="3" cy="-1.5" r="2.4" fill="#ffffff"/>
      <circle cx="-2.6" cy="-1.2" r="1.2" fill="#31316a"/>
      <circle cx="3.4" cy="-1.2" r="1.2" fill="#31316a"/>
    </g>`;
  }

  const p = center(player);
  const ps = view?.playerScale ?? 1;
  const shakeX = view?.shakeX ?? 0;
  const playerSprite = `<g transform="translate(${p.x + shakeX},${p.y}) scale(${ps})">
    <circle cx="0" cy="0" r="${cell / 2 - 8}" fill="#ff6b6b" stroke="#ffd8d8" stroke-width="2.5"/>
    <circle cx="-3.5" cy="-2" r="2" fill="#191a23"/>
    <circle cx="3.5" cy="-2" r="2" fill="#191a23"/>
  </g>`;

  let candleSprite = "";
  if (candle) {
    const c = center(candle);
    candleSprite = `<g transform="translate(${c.x},${c.y})">
      <circle r="14" fill="#ffd43b" opacity="0.14"/>
      <circle r="8" fill="#ffa94d" opacity="0.18"/>
      <rect x="-2.5" y="-1" width="5" height="9" rx="1.5" fill="#ffe8cc"/>
      <line x1="0" y1="-1" x2="0" y2="-2.5" stroke="#846358" stroke-width="1"/>
      <path d="M 0 -8 C 2.4 -5.5 2.4 -3.5 0 -2.2 C -2.4 -3.5 -2.4 -5.5 0 -8" fill="#ffa94d"/>
      <path d="M 0 -5.8 C 1.1 -4.6 1.1 -3.6 0 -2.9 C -1.1 -3.6 -1.1 -4.6 0 -5.8" fill="#ffe066"/>
    </g>`;
  }

  const bursting = state.lightBurst > 0 && state.lightBurst < 1;
  const burstOrigin = state.lightOrigin ? center(state.lightOrigin) : p;
  const startFogR = (fogRadius ?? 4) * cell;

  let fogDefs = "";
  let fogOverlay = "";
  if (fogRadius !== null && (!state.lit || bursting) && !won) {
    const fogR = bursting
      ? startFogR + (Math.hypot(width, height) - startFogR) * easeOutCubic(state.lightBurst)
      : startFogR;
    const fogOp = bursting ? 0.94 * (1 - state.lightBurst) ** 2 : 0.94;
    fogDefs = `<defs>
      <radialGradient id="fogHole">
        <stop offset="55%" stop-color="black"/>
        <stop offset="100%" stop-color="white"/>
      </radialGradient>
      <mask id="fogMask">
        <rect x="0" y="0" width="${width}" height="${height}" fill="white"/>
        <circle cx="${bursting ? burstOrigin.x : p.x}" cy="${bursting ? burstOrigin.y : p.y}" r="${fogR}" fill="url(#fogHole)"/>
      </mask>
    </defs>`;
    fogOverlay = `<rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#0c0d14" opacity="${fogOp}" mask="url(#fogMask)"/>`;
  }

  const lightBurstSprite = bursting ? renderLightBurst(burstOrigin, state.lightBurst, width, height, startFogR) : "";
  const catchFx = view?.catchT != null ? renderCatchFx(p, view.catchT, width, height) : "";
  const introOverlay = view?.introT != null ? renderIntroOverlay(width, height, state, view.introT) : "";

  const winBanner = won
    ? `<rect x="${width / 2 - 150}" y="${height / 2 - 34}" width="300" height="68" rx="14" fill="#12b886" opacity="0.95"/>
       <text x="${width / 2}" y="${height / 2 + 9}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">Level ${state.level} cleared! 🎉</text>`
    : "";

  const scale = Math.min(1, maxDisplayWidth / width);
  const displayWidth = Math.round(width * scale);
  const displayHeight = Math.round(height * scale);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${displayWidth}" height="${displayHeight}" viewBox="0 0 ${width} ${height}">
  ${fogDefs}
  <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="${bgColor}"/>
  ${exitTile}
  ${trailDots}
  ${gemSprites}
  ${portalSprites}
  ${keySprite}
  <path d="${wallSegments.join(" ")}" stroke="${wallColor}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  ${guardSprite}
  ${playerSprite}
  ${fogOverlay}
  ${lightBurstSprite}
  ${catchFx}
  ${bursting || view?.catchT != null ? playerSprite : ""}
  ${candleSprite}
  ${winBanner}
  ${introOverlay}
</svg>`;
}
