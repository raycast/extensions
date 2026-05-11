import { Icon } from "@raycast/api";
import { formatDecimal, formatInternational, normalizeInput, trimNumber } from "./format";
import type { NumbrResult } from "./types";

type StorageUnit = {
  label: string;
  bytes: number;
  system: "decimal" | "binary" | "byte";
  aliases: string[];
};

type ParsedStorage = {
  original: string;
  value: number;
  unit: StorageUnit;
  bytes: number;
};

const STORAGE_UNITS: StorageUnit[] = [
  { label: "B", bytes: 1, system: "byte", aliases: ["byte", "bytes"] },

  { label: "KB", bytes: 1e3, system: "decimal", aliases: ["kb", "kilobyte", "kilobytes"] },
  { label: "MB", bytes: 1e6, system: "decimal", aliases: ["mb", "megabyte", "megabytes"] },
  { label: "GB", bytes: 1e9, system: "decimal", aliases: ["gb", "gigabyte", "gigabytes"] },
  { label: "TB", bytes: 1e12, system: "decimal", aliases: ["tb", "terabyte", "terabytes"] },
  { label: "PB", bytes: 1e15, system: "decimal", aliases: ["pb", "petabyte", "petabytes"] },

  { label: "KiB", bytes: 1024, system: "binary", aliases: ["kib", "kibyte", "kibibyte", "kibibytes"] },
  { label: "MiB", bytes: 1024 ** 2, system: "binary", aliases: ["mib", "mebibyte", "mebibytes"] },
  { label: "GiB", bytes: 1024 ** 3, system: "binary", aliases: ["gib", "gibibyte", "gibibytes"] },
  { label: "TiB", bytes: 1024 ** 4, system: "binary", aliases: ["tib", "tebibyte", "tebibytes"] },
  { label: "PiB", bytes: 1024 ** 5, system: "binary", aliases: ["pib", "pebibyte", "pebibytes"] },
];

const aliasToUnit = new Map<string, StorageUnit>();

for (const unit of STORAGE_UNITS) {
  for (const alias of unit.aliases) {
    aliasToUnit.set(alias, unit);
  }
}

export function canParseStorage(input: string): boolean {
  return parseStorage(input) !== null;
}

export function buildStorageResults(input: string): NumbrResult[] {
  const parsed = parseStorage(input);

  if (!parsed) return [];

  const { original, unit, bytes } = parsed;

  const markdown = [
    `Input: ${original}`,
    `Bytes: ${formatInternational(bytes)} bytes`,
    `Decimal KB: ${trimNumber(bytes / 1e3)} KB`,
    `Decimal MB: ${trimNumber(bytes / 1e6)} MB`,
    `Decimal GB: ${trimNumber(bytes / 1e9)} GB`,
    `Binary KiB: ${trimNumber(bytes / 1024)} KiB`,
    `Binary MiB: ${trimNumber(bytes / 1024 ** 2)} MiB`,
    `Binary GiB: ${trimNumber(bytes / 1024 ** 3)} GiB`,
  ].join("\n");

  return [
    {
      group: "storage",
      icon: Icon.HardDrive,
      title: "Bytes",
      value: `${formatInternational(bytes)} bytes`,
      copyValue: String(bytes),
      markdown,
      accessories: [{ text: unit.system }],
    },
    ...buildStorageConversionRows(bytes, markdown),
  ];
}

function parseStorage(input: string): ParsedStorage | null {
  const original = input.trim();
  const normalized = normalizeInput(input);

  if (!normalized) return null;

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);

  if (!match) return null;

  const value = Number(match[1]);
  const unitToken = match[2];
  const unit = aliasToUnit.get(unitToken);

  if (!unit || !Number.isFinite(value)) return null;

  return {
    original,
    value,
    unit,
    bytes: value * unit.bytes,
  };
}

function buildStorageConversionRows(bytes: number, markdown: string): NumbrResult[] {
  const decimalRows = [
    { title: "Kilobytes", suffix: "KB", divisor: 1e3 },
    { title: "Megabytes", suffix: "MB", divisor: 1e6 },
    { title: "Gigabytes", suffix: "GB", divisor: 1e9 },
    { title: "Terabytes", suffix: "TB", divisor: 1e12 },
  ];

  const binaryRows = [
    { title: "Kibibytes", suffix: "KiB", divisor: 1024 },
    { title: "Mebibytes", suffix: "MiB", divisor: 1024 ** 2 },
    { title: "Gibibytes", suffix: "GiB", divisor: 1024 ** 3 },
    { title: "Tebibytes", suffix: "TiB", divisor: 1024 ** 4 },
  ];

  return [
    ...decimalRows.map((row) => ({
      group: "storage" as const,
      icon: Icon.Calculator,
      title: row.title,
      value: `${formatDecimal(bytes / row.divisor)} ${row.suffix}`,
      copyValue: `${trimNumber(bytes / row.divisor)} ${row.suffix}`,
      markdown,
      accessories: [{ text: "decimal" }],
    })),

    ...binaryRows.map((row) => ({
      group: "storage" as const,
      icon: Icon.MemoryChip,
      title: row.title,
      value: `${formatDecimal(bytes / row.divisor)} ${row.suffix}`,
      copyValue: `${trimNumber(bytes / row.divisor)} ${row.suffix}`,
      markdown,
      accessories: [{ text: "binary" }],
    })),
  ];
}
