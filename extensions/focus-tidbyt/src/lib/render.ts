import fs from "fs/promises";
import { Image } from "cross-image";
import { encodeAnimatedWebp } from "./animated-webp";

const WIDTH = 64;
const HEIGHT = 32;

const FONT: Record<string, string[]> = {
  "0": ["11111", "10001", "10001", "10001", "10001", "10001", "11111"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["11111", "00001", "00001", "11111", "10000", "10000", "11111"],
  "3": ["11111", "00001", "00001", "01111", "00001", "00001", "11111"],
  "4": ["10001", "10001", "10001", "11111", "00001", "00001", "00001"],
  "5": ["11111", "10000", "10000", "11111", "00001", "00001", "11111"],
  "6": ["11111", "10000", "10000", "11111", "10001", "10001", "11111"],
  "7": ["11111", "00001", "00001", "00010", "00100", "00100", "00100"],
  "8": ["11111", "10001", "10001", "11111", "10001", "10001", "11111"],
  "9": ["11111", "10001", "10001", "11111", "00001", "00001", "11111"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  ":": ["00000", "00100", "00100", "00000", "00100", "00100", "00000"],
  m: ["00000", "00000", "11011", "10101", "10101", "10101", "10101"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

const PROGRESS_COLOR = { r: 0, g: 220, b: 0, a: 255 };
const BASE_CHAR_WIDTH = 5;
const BASE_CHAR_HEIGHT = 7;

const TITLE_FONT: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  N: ["101", "111", "111", "111", "101"],
  O: ["111", "101", "101", "101", "111"],
  P: ["111", "101", "111", "100", "100"],
  Q: ["111", "101", "101", "111", "001"],
  R: ["111", "101", "111", "110", "101"],
  S: ["011", "100", "111", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  " ": ["000", "000", "000", "000", "000"],
  "-": ["000", "000", "111", "000", "000"],
  ".": ["000", "000", "000", "000", "010"],
  ":": ["000", "010", "000", "010", "000"],
  "/": ["001", "010", "100", "000", "000"],
  "'": ["010", "010", "000", "000", "000"],
  "&": ["010", "101", "010", "101", "011"],
  _: ["000", "000", "000", "000", "111"],
};

const TITLE_CHAR_WIDTH = 3;
const TITLE_CHAR_HEIGHT = 5;
const TITLE_SPACING = 1;
const TITLE_SCROLL_LEFT_PADDING = 4;
const TITLE_FADE_WIDTH = 10;
const TITLE_SCROLL_DELAY_MS = 10_000;
const TITLE_SCROLL_SPEED_PX_PER_SEC = 9;
const TITLE_TARGET_FPS = 18;
const TITLE_ANIMATION_FRAME_MS = Math.round(1000 / TITLE_TARGET_FPS);
const TITLE_LOOP_GAP_CHARS = 3;
const MAX_TITLE_FRAMES = 300;

type RenderOptions = {
  text: string;
  progress?: number;
  title?: string;
  nowMs?: number;
  startEpochMs?: number;
  animateTitle?: boolean;
};

export async function renderCountdownBase64(
  options: RenderOptions
): Promise<string> {
  const buffer = await renderCountdownWebp(options);
  return buffer.toString("base64");
}

export async function renderCountdownToFile(
  options: RenderOptions,
  outputPath: string
): Promise<void> {
  const buffer = await renderCountdownWebp(options);
  await fs.writeFile(outputPath, buffer);
}

type TitleMetrics = {
  baseChars: string[];
  baseWidth: number;
  loopChars: string[];
  loopWidth: number;
  loopDistancePx: number;
};

type TitleLayout = {
  chars: string[];
  textWidth: number;
  overflowPx: number;
  shouldFade: boolean;
  scrollDistancePx: number;
  baseX: number;
};

async function renderCountdownWebp(options: RenderOptions): Promise<Buffer> {
  const titleMetrics = getTitleMetrics(options.title);
  const shouldScroll = titleMetrics !== null && titleMetrics.baseWidth > WIDTH;
  const baseTitleLayout = titleMetrics
    ? buildTitleLayout(titleMetrics, shouldScroll ? "scroll" : "static")
    : null;
  const loopTitleLayout =
    titleMetrics && shouldScroll
      ? buildTitleLayout(titleMetrics, "loop")
      : null;
  const canAnimateTitle =
    options.animateTitle !== false &&
    titleMetrics !== null &&
    shouldScroll &&
    options.nowMs !== undefined &&
    options.startEpochMs !== undefined;

  if (!canAnimateTitle) {
    const image = renderCountdownFrame(options, {
      titleLayout: baseTitleLayout,
    });
    const webp = await image.encode("webp");
    return Buffer.from(webp);
  }

  if (!loopTitleLayout) {
    const image = renderCountdownFrame(options, {
      titleLayout: baseTitleLayout,
    });
    const webp = await image.encode("webp");
    return Buffer.from(webp);
  }

  const frames = await buildTitleAnimationFrames(
    options,
    loopTitleLayout,
    TITLE_ANIMATION_FRAME_MS
  );
  return encodeAnimatedWebp({
    width: WIDTH,
    height: HEIGHT,
    frameDelayMs: frames.frameDelayMs,
    frames: frames.buffers,
    loops: 0,
  });
}

type FrameRenderOptions = RenderOptions & {
  titleLayout?: TitleLayout | null;
  titleScrollOffsetPx?: number;
};

function renderCountdownFrame(
  options: FrameRenderOptions,
  overrides?: { titleLayout?: TitleLayout | null }
): Image {
  const progress = options.progress ?? 0;
  const titleLayout = overrides?.titleLayout ?? options.titleLayout ?? null;
  const showTitle = Boolean(titleLayout);
  const countdownMaxHeight = showTitle
    ? Math.max(HEIGHT - TITLE_CHAR_HEIGHT, BASE_CHAR_HEIGHT)
    : HEIGHT;

  const { scale, spacing, charWidth, charHeight } = getLayoutForHeight(
    options.text.length,
    countdownMaxHeight
  );
  const maxChars = Math.max(
    1,
    Math.floor((WIDTH + spacing) / (charWidth + spacing))
  );
  const displayText =
    options.text.length > maxChars
      ? options.text.slice(options.text.length - maxChars)
      : options.text;
  const totalWidth =
    displayText.length * charWidth + (displayText.length - 1) * spacing;
  const startX = Math.max(0, Math.floor((WIDTH - totalWidth) / 2));
  let countdownStartY = Math.max(0, Math.floor((HEIGHT - charHeight) / 2));
  let titleStartY = HEIGHT;
  let titleAreaHeight = TITLE_CHAR_HEIGHT;
  if (showTitle) {
    const contentHeight = charHeight + TITLE_CHAR_HEIGHT;
    const totalGap = Math.max(0, HEIGHT - contentHeight);
    const baseGap = Math.floor(totalGap / 3);
    const extraTitlePad = totalGap - baseGap * 3;

    titleAreaHeight = TITLE_CHAR_HEIGHT + extraTitlePad;
    countdownStartY = baseGap;
    titleStartY = baseGap + charHeight + baseGap;
  }

  const image = Image.create(WIDTH, HEIGHT, 0, 0, 0, 255);
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const progressWidth = Math.round(WIDTH * clampedProgress);
  if (progressWidth > 0) {
    image.fillRect(
      0,
      0,
      progressWidth,
      HEIGHT,
      PROGRESS_COLOR.r,
      PROGRESS_COLOR.g,
      PROGRESS_COLOR.b,
      PROGRESS_COLOR.a
    );
  }
  let x = startX;
  for (const char of displayText) {
    drawChar(image, x, countdownStartY, char, scale);
    x += charWidth + spacing;
  }

  if (showTitle && titleLayout) {
    drawTitleText(image, {
      layout: titleLayout,
      top: titleStartY,
      height: titleAreaHeight,
      nowMs: options.nowMs,
      startEpochMs: options.startEpochMs,
      scrollOffsetPx: options.titleScrollOffsetPx,
    });
  }

  return image;
}

function getLayoutForHeight(
  textLength: number,
  maxHeight: number
): {
  scale: number;
  spacing: number;
  charWidth: number;
  charHeight: number;
} {
  const safeLength = Math.max(0, textLength);
  const preferredScale = safeLength <= 3 ? 3 : safeLength <= 5 ? 2 : 1;
  const scales = [preferredScale, preferredScale - 1, 1].filter(
    (scale, index, array) => scale >= 1 && array.indexOf(scale) === index
  );

  for (const scale of scales) {
    const charWidth = BASE_CHAR_WIDTH * scale;
    const charHeight = BASE_CHAR_HEIGHT * scale;
    if (charHeight > maxHeight) continue;

    if (safeLength <= 1) {
      return { scale, spacing: 0, charWidth, charHeight };
    }

    const maxSpacing = Math.floor(
      (WIDTH - safeLength * charWidth) / (safeLength - 1)
    );
    if (maxSpacing >= scale) {
      return { scale, spacing: scale, charWidth, charHeight };
    }
    if (maxSpacing >= 1) {
      return { scale, spacing: maxSpacing, charWidth, charHeight };
    }
  }

  const scale = 1;
  return {
    scale,
    spacing: 0,
    charWidth: BASE_CHAR_WIDTH * scale,
    charHeight: BASE_CHAR_HEIGHT * scale,
  };
}

function drawChar(
  image: Image,
  x: number,
  y: number,
  char: string,
  scale: number
) {
  const glyph = FONT[char] ?? FONT[" "];
  for (let row = 0; row < glyph.length; row += 1) {
    const line = glyph[row];
    for (let col = 0; col < line.length; col += 1) {
      if (line[col] !== "1") continue;
      image.fillRect(
        x + col * scale,
        y + row * scale,
        scale,
        scale,
        255,
        255,
        255,
        255
      );
    }
  }
}

type TitleRenderOptions = {
  layout: TitleLayout;
  top: number;
  height: number;
  nowMs?: number;
  startEpochMs?: number;
  scrollOffsetPx?: number;
};

function drawTitleText(image: Image, options: TitleRenderOptions) {
  const scrollOffset =
    options.scrollOffsetPx ??
    getTitleScrollOffset(
      options.nowMs,
      options.startEpochMs,
      options.layout.scrollDistancePx
    );
  const startX = options.layout.baseX - Math.round(scrollOffset);
  const startY =
    options.top +
    Math.max(0, Math.floor((options.height - TITLE_CHAR_HEIGHT) / 2));

  let x = startX;
  for (const char of options.layout.chars) {
    drawTitleChar(image, x, startY, char, options.layout.shouldFade);
    x += TITLE_CHAR_WIDTH + TITLE_SPACING;
    if (x > WIDTH + options.layout.textWidth) break;
  }
}

function getTitleMetrics(title?: string): TitleMetrics | null {
  const normalized = normalizeTitle(title ?? "");
  if (!normalized) return null;
  const baseChars = Array.from(normalized);
  const baseWidth = measureTitleWidth(baseChars.length);
  const gapChars = Array.from(" ".repeat(TITLE_LOOP_GAP_CHARS));
  const loopChars = [...baseChars, ...gapChars, ...baseChars];
  const loopWidth = measureTitleWidth(loopChars.length);
  const loopDistancePx =
    (TITLE_CHAR_WIDTH + TITLE_SPACING) * (baseChars.length + gapChars.length);
  return {
    baseChars,
    baseWidth,
    loopChars,
    loopWidth,
    loopDistancePx,
  };
}

function buildTitleLayout(
  metrics: TitleMetrics,
  variant: "static" | "scroll" | "loop"
): TitleLayout {
  if (variant === "static") {
    const baseX = Math.max(0, Math.floor((WIDTH - metrics.baseWidth) / 2));
    return {
      chars: metrics.baseChars,
      textWidth: metrics.baseWidth,
      overflowPx: 0,
      shouldFade: false,
      scrollDistancePx: 0,
      baseX,
    };
  }

  const baseX = TITLE_SCROLL_LEFT_PADDING;
  const maxVisibleWidth = WIDTH - baseX;
  const overflowPx = Math.max(0, metrics.baseWidth - maxVisibleWidth);

  if (variant === "loop") {
    return {
      chars: metrics.loopChars,
      textWidth: metrics.loopWidth,
      overflowPx,
      shouldFade: overflowPx > 0,
      scrollDistancePx: metrics.loopDistancePx,
      baseX,
    };
  }

  return {
    chars: metrics.baseChars,
    textWidth: metrics.baseWidth,
    overflowPx,
    shouldFade: overflowPx > 0,
    scrollDistancePx: overflowPx,
    baseX,
  };
}

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

function measureTitleWidth(length: number): number {
  if (length <= 0) return 0;
  return length * TITLE_CHAR_WIDTH + (length - 1) * TITLE_SPACING;
}

function getTitleScrollOffset(
  nowMs: number | undefined,
  startEpochMs: number | undefined,
  scrollDistancePx: number
): number {
  if (!nowMs || !startEpochMs || scrollDistancePx <= 0) return 0;
  const scrollDurationMs =
    (scrollDistancePx / TITLE_SCROLL_SPEED_PX_PER_SEC) * 1000;
  if (scrollDurationMs <= 0) return 0;
  const cycleMs = TITLE_SCROLL_DELAY_MS + scrollDurationMs;
  if (cycleMs <= 0) return 0;

  const elapsedMs = Math.max(0, nowMs - startEpochMs);
  const cyclePos = elapsedMs % cycleMs;
  if (cyclePos <= TITLE_SCROLL_DELAY_MS) return 0;

  const scrollMs = cyclePos - TITLE_SCROLL_DELAY_MS;
  const offset = (scrollMs / 1000) * TITLE_SCROLL_SPEED_PX_PER_SEC;
  return Math.min(scrollDistancePx, offset);
}

async function buildTitleAnimationFrames(
  options: RenderOptions,
  titleLayout: TitleLayout,
  baseFrameMs: number
): Promise<{ buffers: Buffer[]; frameDelayMs: number }> {
  const { frameDelayMs, offsets } = buildTitleOffsets(
    options,
    titleLayout,
    baseFrameMs
  );

  const buffers: Buffer[] = [];
  for (const offset of offsets) {
    const image = renderCountdownFrame(
      { ...options, titleScrollOffsetPx: offset },
      { titleLayout }
    );
    const webp = await image.encode("webp");
    buffers.push(Buffer.from(webp));
  }

  return { buffers, frameDelayMs };
}

function buildTitleOffsets(
  options: RenderOptions,
  titleLayout: TitleLayout,
  baseFrameMs: number
): { frameDelayMs: number; offsets: number[] } {
  const scrollDurationMs =
    (titleLayout.scrollDistancePx / TITLE_SCROLL_SPEED_PX_PER_SEC) * 1000;
  const cycleMs = TITLE_SCROLL_DELAY_MS + scrollDurationMs;
  const safeCycleMs = Math.max(cycleMs, baseFrameMs);
  const frameDelayMs = Math.max(
    baseFrameMs,
    Math.ceil(safeCycleMs / MAX_TITLE_FRAMES)
  );
  const frameCount = Math.max(1, Math.ceil(safeCycleMs / frameDelayMs));

  const offsets = new Array(frameCount).fill(0).map((_, index) => {
    const tMs = index * frameDelayMs;
    if (tMs <= TITLE_SCROLL_DELAY_MS) return 0;
    const scrollMs = tMs - TITLE_SCROLL_DELAY_MS;
    const offset = (scrollMs / 1000) * TITLE_SCROLL_SPEED_PX_PER_SEC;
    return Math.min(titleLayout.scrollDistancePx, offset);
  });

  if (options.nowMs === undefined || options.startEpochMs === undefined) {
    return { frameDelayMs, offsets };
  }

  const elapsedMs = Math.max(0, options.nowMs - options.startEpochMs);
  const cyclePosMs = safeCycleMs > 0 ? elapsedMs % safeCycleMs : 0;
  const startIndex = Math.min(
    offsets.length - 1,
    Math.floor(cyclePosMs / frameDelayMs)
  );
  if (startIndex <= 0) return { frameDelayMs, offsets };
  const rotated = offsets
    .slice(startIndex)
    .concat(offsets.slice(0, startIndex));
  return { frameDelayMs, offsets: rotated };
}

export function getTitleAnimationCycleMs(title?: string): number | null {
  const metrics = getTitleMetrics(title);
  if (!metrics || metrics.baseWidth <= WIDTH) return null;
  const scrollDurationMs =
    (metrics.loopDistancePx / TITLE_SCROLL_SPEED_PX_PER_SEC) * 1000;
  if (scrollDurationMs <= 0) return null;
  return TITLE_SCROLL_DELAY_MS + scrollDurationMs;
}

function drawTitleChar(
  image: Image,
  x: number,
  y: number,
  char: string,
  fadeRight: boolean
) {
  const glyph = getTitleGlyph(char);
  for (let row = 0; row < glyph.length; row += 1) {
    const line = glyph[row];
    for (let col = 0; col < line.length; col += 1) {
      if (line[col] !== "1") continue;
      const pixelX = x + col;
      const pixelY = y + row;
      if (pixelX < 0 || pixelX >= WIDTH) continue;
      if (pixelY < 0 || pixelY >= HEIGHT) continue;
      const alpha = fadeRight ? applyRightFade(pixelX, 255) : 255;
      if (alpha <= 0) continue;
      image.fillRect(pixelX, pixelY, 1, 1, 255, 255, 255, alpha);
    }
  }
}

function getTitleGlyph(char: string): string[] {
  const normalized = char.toUpperCase();
  return TITLE_FONT[normalized] ?? TITLE_FONT[" "];
}

function applyRightFade(x: number, alpha: number): number {
  const fadeStart = Math.max(0, WIDTH - TITLE_FADE_WIDTH);
  if (x < fadeStart) return alpha;
  const fadeSpan = Math.max(1, TITLE_FADE_WIDTH - 1);
  const fadePos = Math.min(TITLE_FADE_WIDTH - 1, x - fadeStart);
  const ratio = 1 - fadePos / fadeSpan;
  return Math.round(alpha * ratio);
}
