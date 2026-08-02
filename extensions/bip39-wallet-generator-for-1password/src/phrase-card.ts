import type { WalletResult } from "./types";

type Appearance = "light" | "dark";

interface Palette {
  cardBg: string;
  cardStroke: string;
  chipBg: string;
  chipStroke: string;
  divider: string;
  heading: string;
  label: string;
  index: string;
  word: string;
  redact: string;
}

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif";

const PALETTES: Record<Appearance, Palette> = {
  dark: {
    cardBg: "#161619",
    cardStroke: "#2B2B31",
    chipBg: "#1F1F24",
    chipStroke: "#303036",
    divider: "#2B2B31",
    heading: "#F2F2F5",
    label: "#8E8E96",
    index: "#6C6C74",
    word: "#F5F5F7",
    redact: "#3D3D45",
  },
  light: {
    cardBg: "#FFFFFF",
    cardStroke: "#E3E3E8",
    chipBg: "#F6F6F8",
    chipStroke: "#E7E7EC",
    divider: "#ECECF0",
    heading: "#1C1C1E",
    label: "#6E6E76",
    index: "#9C9CA4",
    word: "#1C1C1E",
    redact: "#D5D5DB",
  },
};

const WIDTH = 700;
const PAD = 18;
const HEADER_HEIGHT = 52;
const PHRASE_HEADER_HEIGHT = 40;
const CHIP_HEIGHT = 46;
const CHIP_GAP = 8;
const COLUMNS = 4;

export function buildPhraseCardSvg(
  words: string[],
  revealed: boolean,
  appearance: Appearance,
): string {
  const palette = PALETTES[appearance];
  const rows = Math.ceil(words.length / COLUMNS);
  const chipWidth = (WIDTH - PAD * 2 - CHIP_GAP * (COLUMNS - 1)) / COLUMNS;
  const gridTop = PHRASE_HEADER_HEIGHT;
  const gridHeight = rows * CHIP_HEIGHT + (rows - 1) * CHIP_GAP;
  const height = gridTop + gridHeight + PAD;

  const head = [
    `<text x="${PAD}" y="26" font-family="${SANS}" font-size="12" font-weight="600" fill="${palette.heading}">Recovery Phrase</text>`,
    `<text x="${WIDTH - PAD}" y="26" text-anchor="end" font-family="${SANS}" font-size="10.5" fill="${palette.label}">${words.length} words</text>`,
  ].join("");

  const chips = words
    .map((word, index) => {
      const x = PAD + (index % COLUMNS) * (chipWidth + CHIP_GAP);
      const y =
        gridTop + Math.floor(index / COLUMNS) * (CHIP_HEIGHT + CHIP_GAP);
      const parts = [
        `<rect x="${x}" y="${y}" width="${chipWidth}" height="${CHIP_HEIGHT}" rx="10" fill="${palette.chipBg}" stroke="${palette.chipStroke}"/>`,
        `<text x="${x + 12}" y="${y + 16}" font-family="${SANS}" font-size="9.5" font-weight="500" fill="${palette.index}">${String(index + 1).padStart(2, "0")}</text>`,
      ];
      if (revealed) {
        parts.push(
          `<text x="${x + chipWidth / 2}" y="${y + 32}" text-anchor="middle" font-family="${MONO}" font-size="14.5" font-weight="600" fill="${palette.word}">${word}</text>`,
        );
      } else {
        parts.push(
          `<rect x="${x + chipWidth / 2 - 27}" y="${y + 25}" width="54" height="7" rx="3.5" fill="${palette.redact}"/>`,
        );
      }
      return parts.join("");
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" font-family="${SANS}">`,
    `<rect width="${WIDTH}" height="${height}" rx="16" fill="${palette.cardBg}" stroke="${palette.cardStroke}"/>`,
    head,
    chips,
    `</svg>`,
  ].join("");
}

export function phraseCardDataUri(
  words: string[],
  revealed: boolean,
  appearance: Appearance,
): string {
  const svg = buildPhraseCardSvg(words, revealed, appearance);
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

interface ChainRow {
  name: string;
  ticker: string;
  color: string;
  detail: string;
  address: string;
}

function chainRows(chains: WalletResult["chains"]): ChainRow[] {
  return [
    {
      name: "Bitcoin",
      ticker: "BTC",
      color: "#F7931A",
      detail: chains.btc.path,
      address: chains.btc.address,
    },
    {
      name: "Ethereum",
      ticker: "ETH",
      color: "#627EEA",
      detail: chains.evm.path,
      address: chains.evm.address,
    },
    {
      name: "Solana",
      ticker: "SOL",
      color: "#9945FF",
      detail: chains.sol.path,
      address: chains.sol.address,
    },
  ];
}

export function buildAddressCardSvg(
  chains: WalletResult["chains"],
  appearance: Appearance,
): string {
  const palette = PALETTES[appearance];
  const rows = chainRows(chains);
  const ROW_HEIGHT = 54;
  const gridTop = HEADER_HEIGHT;
  const height = gridTop + rows.length * ROW_HEIGHT + PAD - 8;

  const body = rows
    .map((row, index) => {
      const y = gridTop + index * ROW_HEIGHT;
      const badgeY = y + (ROW_HEIGHT - 30) / 2;
      const divider =
        index < rows.length - 1
          ? `<line x1="${PAD}" y1="${y + ROW_HEIGHT}" x2="${WIDTH - PAD}" y2="${y + ROW_HEIGHT}" stroke="${palette.divider}"/>`
          : "";
      return [
        `<rect x="${PAD}" y="${badgeY}" width="30" height="30" rx="9" fill="${row.color}"/>`,
        `<text x="${PAD + 15}" y="${badgeY + 19.5}" text-anchor="middle" font-family="${SANS}" font-size="9.5" font-weight="700" fill="#FFFFFF">${row.ticker}</text>`,
        `<text x="${PAD + 42}" y="${y + 25}" font-family="${SANS}" font-size="13" font-weight="600" fill="${palette.heading}">${row.name}</text>`,
        `<text x="${PAD + 42}" y="${y + 42}" font-family="${MONO}" font-size="10.5" fill="${palette.label}">${row.detail}</text>`,
        `<text x="${WIDTH - PAD}" y="${y + 34}" text-anchor="end" font-family="${MONO}" font-size="13.5" fill="${palette.word}">${row.address}</text>`,
        divider,
      ].join("");
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" font-family="${SANS}">`,
    `<rect width="${WIDTH}" height="${height}" rx="16" fill="${palette.cardBg}" stroke="${palette.cardStroke}"/>`,
    `<text x="${PAD}" y="33" font-family="${SANS}" font-size="12" font-weight="600" fill="${palette.heading}">Public Addresses</text>`,
    `<text x="${WIDTH - PAD}" y="33" text-anchor="end" font-family="${SANS}" font-size="10.5" fill="${palette.label}">derived locally</text>`,
    `<line x1="${PAD}" y1="${HEADER_HEIGHT}" x2="${WIDTH - PAD}" y2="${HEADER_HEIGHT}" stroke="${palette.divider}"/>`,
    body,
    `</svg>`,
  ].join("");
}

export function addressCardDataUri(
  chains: WalletResult["chains"],
  appearance: Appearance,
): string {
  const svg = buildAddressCardSvg(chains, appearance);
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
