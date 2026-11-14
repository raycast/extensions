import { environment } from "@raycast/api";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ASSISTANT_COLORS } from "../../constants/assistant";

// Raycast markdown can't style text, so rows are 2x PNGs; Raycast blurs SVGs.
const PIXEL_RATIO = 2;
const ROW_WIDTH = 430;
const ROW_HEIGHT = 24;
const TEXT_BASELINE = 17;

const AVATAR_SIZE = 22;
const CONTENT_X = AVATAR_SIZE + 8;
const ICON_SIZE = 14;
const TEXT_X_AFTER_ICON = CONTENT_X + ICON_SIZE + 6;
const TEXT_SIZE = 15;

const PILL_TEXT_SIZE = 12;
const PILL_HEIGHT = 20;
const PILL_PADDING_X = 8;
const PILL_MAX_TEXT = "0".repeat(20);

const SHIMMER_FRAME_COUNT = 30;

// Inter only covers these scripts, and resvg draws a box for any other glyph.
const INTER_TEXT_REGEX =
  /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Common}\p{Script=Inherited}]*$/u;
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

const ICONS = {
  search:
    '<path d="M20.34 20.34L16.02 16.02M3.66 10.85C3.66 6.88 6.88 3.66 10.85 3.66C14.82 3.66 18.04 6.88 18.04 10.85C18.04 14.82 14.82 18.04 10.85 18.04C6.88 18.04 3.66 14.82 3.66 10.85Z"/>',
  user: '<circle cx="12" cy="12" r="8.34"/><circle cx="12" cy="9.7" r="2.59"/><path d="M7.14 18.3C8.3 16.91 10.05 16.02 12 16.02C13.95 16.02 15.7 16.91 16.86 18.3"/>',
};

type Renderer = Awaited<ReturnType<typeof loadRenderer>>;

type Row = {
  text: string;
  tone: "question" | "status";
  icon?: "search";
  isShimmering?: boolean;
};

let wasmReady: Promise<void> | undefined;

const readAsset = (fileName: string) => readFileSync(join(environment.assetsPath, fileName));

export const loadRenderer = async () => {
  wasmReady ??= initWasm(readAsset("resvg.wasm"));
  await wasmReady;
  return {
    font: readAsset("Inter-Regular.ttf"),
    logo: readAsset("assistant-logo.png").toString("base64"),
  };
};

export const canRenderText = (text: string) => INTER_TEXT_REGEX.test(text) && !EMOJI_REGEX.test(text);

const getColors = () => ASSISTANT_COLORS[environment.appearance];

const escapeXml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const getSvg = (width: number, content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${ROW_HEIGHT}">${content}</svg>`;

const getText = (text: string, x: number, size: number, fill: string) =>
  `<text x="${x}" y="${TEXT_BASELINE}" font-size="${size}" fill="${fill}">${escapeXml(text)}</text>`;

const getIcon = (icon: keyof typeof ICONS, x: number, size: number, color: string) =>
  `<g transform="translate(${x} ${(ROW_HEIGHT - size) / 2}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="1.72" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g>`;

const createResvg = (svg: string, { font }: Renderer, zoom = 1) =>
  new Resvg(svg, { fitTo: { mode: "zoom", value: zoom }, font: { loadSystemFonts: false, fontBuffers: [font] } });

const renderPng = (svg: string, renderer: Renderer) => {
  const resvg = createResvg(svg, renderer, PIXEL_RATIO);
  const image = resvg.render();
  const png = image.asPng();
  image.free();
  resvg.free();
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
};

const measureText = (text: string, size: number, renderer: Renderer) => {
  const resvg = createResvg(getSvg(ROW_WIDTH, getText(text, 0, size, "#000")), renderer);
  const width = resvg.getBBox()?.width ?? 0;
  resvg.free();
  return width;
};

const fitText = (text: string, maxWidth: number, size: number, renderer: Renderer) => {
  if (measureText(text, size, renderer) <= maxWidth) return text;
  const words = text.split(" ");
  const fittingWordCount = words.findLastIndex(
    (_, index) => measureText(`${words.slice(0, index + 1).join(" ")}…`, size, renderer) <= maxWidth,
  );
  return `${words.slice(0, Math.max(1, fittingWordCount + 1)).join(" ")}…`;
};

const fitsByText = new Map<string, boolean>();

export const fitsRow = (text: string, renderer: Renderer) => {
  if (!fitsByText.has(text)) fitsByText.set(text, measureText(text, TEXT_SIZE, renderer) <= ROW_WIDTH - CONTENT_X);
  return fitsByText.get(text);
};

const getShimmerGradient = (color: string, frameIndex: number) => {
  const time = frameIndex / SHIMMER_FRAME_COUNT;
  const maskPosition = time < 0.25 ? 1 - 0.6 * time : 0.85 * (1 - (time - 0.25) / 0.75);
  const bandCenter = 1.5 - 2 * maskPosition;
  const stop = (offset: number, opacity: number) =>
    `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`;
  return `<defs><linearGradient id="shimmer" x1="${bandCenter - 0.3}" x2="${bandCenter + 0.3}">${stop(0, 0.8)}${stop(0.5, 0.2)}${stop(1, 0.8)}</linearGradient></defs>`;
};

const getRowSvg = (row: Row, text: string, renderer: Renderer, frameIndex?: number) => {
  const colors = getColors();
  const color = row.tone === "question" ? colors.labelSubtle : colors.labelTertiary;
  const avatar =
    row.tone === "question"
      ? getIcon("user", 1, AVATAR_SIZE - 2, colors.label)
      : `<image y="${(ROW_HEIGHT - AVATAR_SIZE) / 2}" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" xlink:href="data:image/png;base64,${renderer.logo}"/>`;
  return getSvg(
    ROW_WIDTH,
    [
      frameIndex === undefined ? "" : getShimmerGradient(color, frameIndex),
      avatar,
      row.icon ? getIcon(row.icon, CONTENT_X, ICON_SIZE, color) : "",
      getText(
        text,
        row.icon ? TEXT_X_AFTER_ICON : CONTENT_X,
        TEXT_SIZE,
        frameIndex === undefined ? color : "url(#shimmer)",
      ),
    ].join(""),
  );
};

const imagesByKey = new Map<string, { frames: string[]; width: number; height: number }>();

const renderOnce = (request: unknown, render: () => { frames: string[]; width: number }) => {
  const key = JSON.stringify([environment.appearance, request]);
  const cachedImage = imagesByKey.get(key);
  if (cachedImage) return cachedImage;
  const image = { ...render(), height: ROW_HEIGHT };
  imagesByKey.set(key, image);
  return image;
};

export const renderRow = (row: Row, renderer: Renderer) =>
  renderOnce(row, () => {
    const textX = row.icon ? TEXT_X_AFTER_ICON : CONTENT_X;
    const text = fitText(row.text, ROW_WIDTH - textX, TEXT_SIZE, renderer);
    const frameIndexes = row.isShimmering
      ? Array.from({ length: SHIMMER_FRAME_COUNT }, (_, index) => index)
      : [undefined];
    return {
      frames: frameIndexes.map((frameIndex) => renderPng(getRowSvg(row, text, renderer, frameIndex), renderer)),
      width: ROW_WIDTH,
    };
  });

export const renderSourcePill = (name: string, renderer: Renderer) =>
  renderOnce({ pill: name }, () => {
    const { labelSecondary, backgroundTertiary } = getColors();
    const maxTextWidth = measureText(PILL_MAX_TEXT, PILL_TEXT_SIZE, renderer);
    const text = fitText(name, maxTextWidth, PILL_TEXT_SIZE, renderer);
    const width = Math.ceil(measureText(text, PILL_TEXT_SIZE, renderer) + PILL_PADDING_X * 2);
    const pillY = (ROW_HEIGHT - PILL_HEIGHT) / 2;
    const svg = getSvg(
      width,
      `<rect y="${pillY}" width="${width}" height="${PILL_HEIGHT}" rx="${PILL_HEIGHT / 2}" fill="${backgroundTertiary}"/>${getText(text, PILL_PADDING_X, PILL_TEXT_SIZE, labelSecondary)}`,
    );
    return { frames: [renderPng(svg, renderer)], width };
  });
