export interface KeyboardLayoutOptions {
  appearance?: KeyboardLayoutAppearance;
  selectedKey?: string;
  size?: KeyboardLayoutSize;
  title?: string;
}

export type KeyboardLayoutAppearance = "light" | "dark";
export type KeyboardLayoutSize = "compact" | "default" | "large";

export interface KeyboardLayoutItem {
  key: string;
  label?: string;
  type?: string;
  value?: string;
  actions?: KeyboardLayoutItem[];
}

export interface KeyboardLayoutMetadataRow {
  title: string;
  text: string;
}

interface KeyboardPhysicalKey {
  lower: string;
  upper: string;
}

const US_QWERTY_LAYOUT: KeyboardPhysicalKey[][] = [
  [
    { lower: "`", upper: "~" },
    { lower: "1", upper: "!" },
    { lower: "2", upper: "@" },
    { lower: "3", upper: "#" },
    { lower: "4", upper: "$" },
    { lower: "5", upper: "%" },
    { lower: "6", upper: "^" },
    { lower: "7", upper: "&" },
    { lower: "8", upper: "*" },
    { lower: "9", upper: "(" },
    { lower: "0", upper: ")" },
    { lower: "-", upper: "_" },
    { lower: "=", upper: "+" },
  ],
  [
    { lower: "q", upper: "Q" },
    { lower: "w", upper: "W" },
    { lower: "e", upper: "E" },
    { lower: "r", upper: "R" },
    { lower: "t", upper: "T" },
    { lower: "y", upper: "Y" },
    { lower: "u", upper: "U" },
    { lower: "i", upper: "I" },
    { lower: "o", upper: "O" },
    { lower: "p", upper: "P" },
    { lower: "[", upper: "{" },
    { lower: "]", upper: "}" },
    { lower: "\\", upper: "|" },
  ],
  [
    { lower: "a", upper: "A" },
    { lower: "s", upper: "S" },
    { lower: "d", upper: "D" },
    { lower: "f", upper: "F" },
    { lower: "g", upper: "G" },
    { lower: "h", upper: "H" },
    { lower: "j", upper: "J" },
    { lower: "k", upper: "K" },
    { lower: "l", upper: "L" },
    { lower: ";", upper: ":" },
    { lower: "'", upper: '"' },
  ],
  [
    { lower: "z", upper: "Z" },
    { lower: "x", upper: "X" },
    { lower: "c", upper: "C" },
    { lower: "v", upper: "V" },
    { lower: "b", upper: "B" },
    { lower: "n", upper: "N" },
    { lower: "m", upper: "M" },
    { lower: ",", upper: "<" },
    { lower: ".", upper: ">" },
    { lower: "/", upper: "?" },
  ],
];

export const KEYBOARD_ROWS = US_QWERTY_LAYOUT.flatMap((row) => [
  row.map((key) => key.lower),
  row.map((key) => key.upper),
]);

const KEYBOARD_KEYS: ReadonlySet<string> = new Set(KEYBOARD_ROWS.flat());

interface KeyboardLayoutMetrics {
  svgWidth: number;
  keyWidth: number;
  keyHeight: number;
  keyGap: number;
  firstRowY: number;
  rowGap: number;
  rowOffsets: readonly number[];
  paddingX: number;
  footerTitleOffset: number;
  titleFontSize: number;
  zoneLabelOffset: number;
  keyFontSize: number;
  bottomPadding: number;
  keyRadius: number;
  zoneRadius: number;
  dividerInset: number;
}

interface KeyboardLayoutPalette {
  emptyKeyFill: string;
  keyStroke: string;
  divider: string;
  emptyText: string;
  boundFill: string;
  boundStroke: string;
  boundText: string;
  selectedFill: string;
  selectedStroke: string;
  selectedText: string;
  titleText: string;
  titleStroke: string;
}

const KEYBOARD_LAYOUT_METRICS: Record<
  KeyboardLayoutSize,
  KeyboardLayoutMetrics
> = {
  compact: {
    svgWidth: 360,
    keyWidth: 24,
    keyHeight: 34,
    keyGap: 3,
    firstRowY: 2,
    rowGap: 7,
    rowOffsets: [0, 0, 14, 29],
    paddingX: 17,
    footerTitleOffset: 2,
    titleFontSize: 14,
    zoneLabelOffset: 12,
    keyFontSize: 9,
    bottomPadding: 16,
    keyRadius: 5,
    zoneRadius: 4,
    dividerInset: 4,
  },
  default: {
    svgWidth: 420,
    keyWidth: 28,
    keyHeight: 40,
    keyGap: 4,
    firstRowY: 2,
    rowGap: 8,
    rowOffsets: [0, 0, 16, 34],
    paddingX: 20,
    footerTitleOffset: 2,
    titleFontSize: 16,
    zoneLabelOffset: 14,
    keyFontSize: 11,
    bottomPadding: 18,
    keyRadius: 6,
    zoneRadius: 4,
    dividerInset: 5,
  },
  large: {
    svgWidth: 500,
    keyWidth: 34,
    keyHeight: 48,
    keyGap: 5,
    firstRowY: 2,
    rowGap: 10,
    rowOffsets: [0, 0, 20, 42],
    paddingX: 24,
    footerTitleOffset: 3,
    titleFontSize: 18,
    zoneLabelOffset: 17,
    keyFontSize: 13,
    bottomPadding: 24,
    keyRadius: 7,
    zoneRadius: 5,
    dividerInset: 6,
  },
};

const KEYBOARD_LAYOUT_PALETTES: Record<
  KeyboardLayoutAppearance,
  KeyboardLayoutPalette
> = {
  dark: {
    emptyKeyFill: "#1E293B",
    keyStroke: "#334155",
    divider: "#334155",
    emptyText: "#CBD5E1",
    boundFill: "#1E3A8A",
    boundStroke: "#60A5FA",
    boundText: "#FFFFFF",
    selectedFill: "#F59E0B",
    selectedStroke: "#FDE68A",
    selectedText: "#111827",
    titleText: "#E5E7EB",
    titleStroke: "#0F172A",
  },
  light: {
    emptyKeyFill: "#FFFFFF",
    keyStroke: "#CBD5E1",
    divider: "#CBD5E1",
    emptyText: "#475569",
    boundFill: "#DBEAFE",
    boundStroke: "#2563EB",
    boundText: "#1E3A8A",
    selectedFill: "#F59E0B",
    selectedStroke: "#B45309",
    selectedText: "#111827",
    titleText: "#111827",
    titleStroke: "#FFFFFF",
  },
};

interface KeyBinding {
  key: string;
  label: string;
  type?: string;
  value?: string;
  itemCount?: number;
}

export function renderKeyboardLayoutMarkdown(
  items: KeyboardLayoutItem[],
  options: KeyboardLayoutOptions = {},
): string {
  const svg = renderKeyboardLayoutSvg(items, options);

  return `![Keyboard layout](data:image/svg+xml;utf8,${encodeURIComponent(svg)})`;
}

export function renderKeyboardLayoutMetadata(
  items: KeyboardLayoutItem[],
  selectedKey?: string,
): KeyboardLayoutMetadataRow[] {
  const selectedBinding = selectedKey
    ? getBindingsByKey(items).get(selectedKey)
    : undefined;

  return selectedBinding
    ? renderSelectedBindingMetadataRows(selectedBinding)
    : [];
}

export function renderKeyboardLayoutSvg(
  items: KeyboardLayoutItem[],
  options: KeyboardLayoutOptions = {},
): string {
  const bindingsByKey = getBindingsByKey(items);
  const metrics = getKeyboardLayoutMetrics(options.size);
  const palette = getKeyboardLayoutPalette(options.appearance);
  const keyboard = renderKeyboard(
    bindingsByKey,
    options.selectedKey,
    metrics,
    palette,
  );
  const title = options.title || "Current Group";
  const height = keyboard.height + metrics.bottomPadding;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${metrics.svgWidth}" height="${height}" viewBox="0 0 ${metrics.svgWidth} ${height}" role="img" aria-label="Leader key keyboard layout">`,
    keyboard.svg,
    `<text x="${metrics.paddingX}" y="${formatNumber(keyboard.height + metrics.footerTitleOffset)}" fill="${palette.titleText}" stroke="${palette.titleStroke}" stroke-width="3" paint-order="stroke" stroke-linejoin="round" font-size="${metrics.titleFontSize}" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">${escapeXml(truncate(title, 34))}</text>`,
    "</svg>",
  ].join("");
}

export function renderKeyboardLayoutText(
  items: KeyboardLayoutItem[],
  options: KeyboardLayoutOptions = {},
): string {
  const bindings = getCurrentLevelBindings(items);
  const boundKeys = new Set(bindings.map((binding) => binding.key));
  const selectedKey = options.selectedKey;
  const title = options.title || "Current Group";
  const rows = KEYBOARD_ROWS.map((row) =>
    row
      .map((key) => {
        if (selectedKey === key) {
          return `*${key}*`;
        }

        if (boundKeys.has(key)) {
          return `[${key}]`;
        }

        return ` ${key} `;
      })
      .join(" "),
  );
  const otherBindings = bindings.filter(
    (binding) => !KEYBOARD_KEYS.has(binding.key),
  );
  const selectedBinding = selectedKey
    ? bindings.find((binding) => binding.key === selectedKey)
    : undefined;
  const metadata = selectedBinding
    ? `\nSelected: ${selectedBinding.label} (${selectedBinding.key})`
    : "";
  const other =
    otherBindings.length > 0
      ? `\nOther used keys: ${otherBindings
          .map((binding) => binding.key)
          .join(", ")}`
      : "";

  return [
    `${title} available keys`,
    "Keys in [brackets] are already used.",
    "Current key is marked with *asterisks*.",
    "",
    ...rows,
    metadata,
    other,
  ]
    .filter(Boolean)
    .join("\n");
}

function getBindingsByKey(
  items: KeyboardLayoutItem[],
): Map<string, KeyBinding> {
  const bindingsByKey = new Map<string, KeyBinding>();

  for (const binding of getCurrentLevelBindings(items)) {
    if (!bindingsByKey.has(binding.key)) {
      bindingsByKey.set(binding.key, binding);
    }
  }

  return bindingsByKey;
}

function getCurrentLevelBindings(items: KeyboardLayoutItem[]): KeyBinding[] {
  return items.map((item) => ({
    key: item.key,
    label: item.label || item.key,
    type: item.type,
    value: item.value,
    itemCount: item.actions?.length,
  }));
}

function renderKeyboard(
  bindingsByKey: Map<string, KeyBinding>,
  selectedKey?: string,
  metrics: KeyboardLayoutMetrics = getKeyboardLayoutMetrics(),
  palette: KeyboardLayoutPalette = getKeyboardLayoutPalette(),
): { svg: string; height: number } {
  const rows: string[] = [];
  let y = metrics.firstRowY;

  US_QWERTY_LAYOUT.forEach((row, rowIndex) => {
    const rowWidth =
      row.length * metrics.keyWidth + (row.length - 1) * metrics.keyGap;
    const rowOffset = metrics.rowOffsets[rowIndex] || 0;
    const startX = (metrics.svgWidth - rowWidth) / 2 + rowOffset;

    row.forEach((key, keyIndex) => {
      const x = startX + keyIndex * (metrics.keyWidth + metrics.keyGap);
      rows.push(
        renderPhysicalKey(
          key,
          x,
          y,
          bindingsByKey,
          selectedKey,
          metrics,
          palette,
        ),
      );
    });

    y += metrics.keyHeight + metrics.rowGap;
  });

  return { svg: rows.join(""), height: y };
}

function renderPhysicalKey(
  key: KeyboardPhysicalKey,
  x: number,
  y: number,
  bindingsByKey: Map<string, KeyBinding>,
  selectedKey?: string,
  metrics: KeyboardLayoutMetrics = getKeyboardLayoutMetrics(),
  palette: KeyboardLayoutPalette = getKeyboardLayoutPalette(),
): string {
  const zones = [
    {
      value: key.upper,
      labelX: x + metrics.keyWidth * 0.68,
      labelY: y + metrics.keyHeight * 0.36,
      points: [
        [x + 1, y + 1],
        [x + metrics.keyWidth - 1, y + 1],
        [x + metrics.keyWidth - 1, y + metrics.keyHeight - 1],
      ],
      position: "upper",
    },
    {
      value: key.lower,
      labelX: x + metrics.keyWidth * 0.32,
      labelY: y + metrics.keyHeight * 0.76,
      points: [
        [x + 1, y + 1],
        [x + 1, y + metrics.keyHeight - 1],
        [x + metrics.keyWidth - 1, y + metrics.keyHeight - 1],
      ],
      position: "lower",
    },
  ];

  return [
    `<g data-physical-key="${escapeXml(key.lower)}">`,
    `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${metrics.keyWidth}" height="${metrics.keyHeight}" rx="${metrics.keyRadius}" fill="${palette.emptyKeyFill}" stroke="${palette.keyStroke}" stroke-width="1"/>`,
    ...zones.map((zone) =>
      renderKeyZone({
        key: zone.value,
        labelX: zone.labelX,
        labelY: zone.labelY,
        points: zone.points,
        position: zone.position,
        binding: bindingsByKey.get(zone.value),
        isSelected: selectedKey === zone.value,
        metrics,
        palette,
      }),
    ),
    `<line x1="${formatNumber(x + 1)}" y1="${formatNumber(y + 1)}" x2="${formatNumber(x + metrics.keyWidth - 1)}" y2="${formatNumber(y + metrics.keyHeight - 1)}" stroke="${palette.divider}" stroke-width="1"/>`,
    "</g>",
  ].join("");
}

function renderKeyZone({
  key,
  labelX,
  labelY,
  points,
  position,
  binding,
  isSelected,
  metrics,
  palette,
}: {
  key: string;
  labelX: number;
  labelY: number;
  points: number[][];
  position: string;
  binding: KeyBinding | undefined;
  isSelected: boolean;
  metrics: KeyboardLayoutMetrics;
  palette: KeyboardLayoutPalette;
}): string {
  const state = isSelected ? "selected" : binding ? "bound" : "empty";
  const fill = isSelected
    ? palette.selectedFill
    : binding
      ? palette.boundFill
      : "transparent";
  const stroke = isSelected
    ? palette.selectedStroke
    : binding
      ? palette.boundStroke
      : "transparent";
  const textFill = isSelected
    ? palette.selectedText
    : binding
      ? palette.boundText
      : palette.emptyText;
  const bindingAttribute = binding
    ? ` data-binding-key="${escapeXml(binding.key)}"`
    : "";

  return [
    `<g data-key="${escapeXml(key)}"${bindingAttribute} data-position="${position}" data-state="${state}">`,
    `<polygon points="${formatPolygonPoints(points)}" fill="${fill}" stroke="${stroke}" stroke-width="${binding || isSelected ? "1" : "0"}" stroke-linejoin="round"/>`,
    `<text x="${formatNumber(labelX)}" y="${formatNumber(labelY)}" text-anchor="middle" dominant-baseline="middle" fill="${textFill}" font-size="${metrics.keyFontSize}" font-weight="800" font-family="ui-monospace,SFMono-Regular,Menlo,monospace">${escapeXml(key)}</text>`,
    "</g>",
  ].join("");
}

function getKeyboardLayoutMetrics(
  size: KeyboardLayoutSize = "default",
): KeyboardLayoutMetrics {
  return KEYBOARD_LAYOUT_METRICS[size] || KEYBOARD_LAYOUT_METRICS.default;
}

function getKeyboardLayoutPalette(
  appearance: KeyboardLayoutAppearance = "dark",
): KeyboardLayoutPalette {
  return KEYBOARD_LAYOUT_PALETTES[appearance] || KEYBOARD_LAYOUT_PALETTES.dark;
}

function renderSelectedBindingMetadataRows(
  binding: KeyBinding,
): KeyboardLayoutMetadataRow[] {
  const rows = [
    ["Name", binding.label],
    ["Key", binding.key],
    ["Type", getBindingTypeLabel(binding)],
    [
      binding.itemCount === undefined ? "Value" : "Items",
      getBindingValue(binding),
    ],
  ];

  return rows.map(([title, text]) => ({ title, text }));
}

function getBindingTypeLabel(binding: KeyBinding): string {
  if (binding.itemCount !== undefined) {
    return "Group";
  }

  if (!binding.type) {
    return "Action";
  }

  return binding.type
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getBindingValue(binding: KeyBinding): string {
  if (binding.itemCount !== undefined) {
    return `${binding.itemCount}`;
  }

  return binding.value || "";
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatPolygonPoints(points: number[][]): string {
  return points
    .map(([x, y]) => `${formatNumber(x)},${formatNumber(y)}`)
    .join(" ");
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
