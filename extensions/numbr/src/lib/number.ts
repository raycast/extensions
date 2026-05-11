import { Icon } from "@raycast/api";
import { formatCompact, formatIndian, formatInternational, normalizeInput, trimNumber } from "./format";
import type { NumbrResult } from "./types";
import { numberToWords } from "./words";

type Scale = {
  key: string;
  label: string;
  multiplier: number;
  aliases: string[];
};

type ParsedLargeNumber = {
  original: string;
  value: number;
  unit: string;
  scale: Scale;
  result: number;
};

const SCALES: Scale[] = [
  { key: "K", label: "Thousand", multiplier: 1e3, aliases: ["k", "thousand", "thousands"] },
  { key: "L", label: "Lakh", multiplier: 1e5, aliases: ["l", "lac", "lakh", "lakhs"] },
  { key: "M", label: "Million", multiplier: 1e6, aliases: ["m", "mn", "mil", "million", "millions"] },
  { key: "Cr", label: "Crore", multiplier: 1e7, aliases: ["cr", "crore", "crores"] },
  { key: "B", label: "Billion", multiplier: 1e9, aliases: ["b", "bn", "billion", "billions"] },
  { key: "T", label: "Trillion", multiplier: 1e12, aliases: ["t", "tn", "trillion", "trillions"] },
  {
    key: "Q",
    label: "Quadrillion",
    multiplier: 1e15,
    aliases: ["q", "quad", "quadrillion", "quadrillions", "quantrilion", "quatrillion"],
  },
  { key: "Qi", label: "Quintillion", multiplier: 1e18, aliases: ["qi", "quintillion", "quintillions"] },
  { key: "Sx", label: "Sextillion", multiplier: 1e21, aliases: ["sx", "sextillion", "sextillions"] },
  { key: "Sp", label: "Septillion", multiplier: 1e24, aliases: ["sp", "septillion", "septillions"] },
  { key: "Oc", label: "Octillion", multiplier: 1e27, aliases: ["oc", "octillion", "octillions"] },
  { key: "No", label: "Nonillion", multiplier: 1e30, aliases: ["no", "nonillion", "nonillions"] },
  { key: "Dc", label: "Decillion", multiplier: 1e33, aliases: ["dc", "decillion", "decillions"] },
];

const aliasToScale = new Map<string, Scale>();

for (const scale of SCALES) {
  for (const alias of scale.aliases) {
    aliasToScale.set(alias, scale);
  }
}

export function buildNumberResults(input: string): NumbrResult[] {
  const parsed = parseLargeNumber(input);

  if (!parsed) return [];

  const { original, unit, scale, result } = parsed;

  const international = formatInternational(result);
  const indian = formatIndian(result);
  const scientific = result.toExponential();
  const compact = formatCompact(result);
  const words = numberToWords(result);

  const markdown = [
    `Input: ${original}`,
    `Result: ${international}`,
    `Words: ${words}`,
    `Indian Format: ${indian}`,
    `Scientific: ${scientific}`,
    `Compact: ${compact}`,
    `Scale: ${scale.label}`,
  ].join("\n");

  return [
    {
      group: "number",
      icon: Icon.Hashtag,
      title: "International Format",
      value: international,
      copyValue: international,
      markdown,
      accessories: [{ text: scale.label }],
    },
    {
      group: "number",
      icon: Icon.Text,
      title: "Number in Words",
      value: words,
      copyValue: words,
      markdown,
      accessories: [{ text: "en-US" }],
    },
    {
      group: "number",
      icon: Icon.Globe,
      title: "Indian Format",
      value: indian,
      copyValue: indian,
      markdown,
      accessories: [{ text: "en-IN" }],
    },
    {
      group: "number",
      icon: Icon.Code,
      title: "Scientific Notation",
      value: scientific,
      copyValue: scientific,
      markdown,
      accessories: [{ text: "10^n" }],
    },
    {
      group: "number",
      icon: Icon.Text,
      title: "Compact Format",
      value: compact,
      copyValue: compact,
      markdown,
    },
    ...buildNumberComparisons(result, unit),
  ];
}

function parseLargeNumber(input: string): ParsedLargeNumber | null {
  const original = input.trim();
  const normalized = normalizeInput(input);

  if (!normalized) return null;

  const plainNumber = normalized.match(/^-?\d+(?:\.\d+)?$/);

  if (plainNumber) {
    const value = Number(normalized);

    if (!Number.isFinite(value)) return null;

    return {
      original,
      value,
      unit: "number",
      scale: {
        key: "",
        label: "Plain Number",
        multiplier: 1,
        aliases: [],
      },
      result: value,
    };
  }

  const wholeUnit = aliasToScale.get(normalized);

  if (wholeUnit) {
    return {
      original,
      value: 1,
      unit: normalized,
      scale: wholeUnit,
      result: wholeUnit.multiplier,
    };
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);

  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2];
  const scale = aliasToScale.get(unit);

  if (!scale || !Number.isFinite(value)) return null;

  return {
    original,
    value,
    unit,
    scale,
    result: value * scale.multiplier,
  };
}

function buildNumberComparisons(result: number, originalUnit: string): NumbrResult[] {
  const comparisonScales = [
    { title: "In Thousands", suffix: "K", divisor: 1e3 },
    { title: "In Lakhs", suffix: "L", divisor: 1e5 },
    { title: "In Millions", suffix: "M", divisor: 1e6 },
    { title: "In Crores", suffix: "Cr", divisor: 1e7 },
    { title: "In Billions", suffix: "B", divisor: 1e9 },
    { title: "In Trillions", suffix: "T", divisor: 1e12 },
    { title: "In Quadrillions", suffix: "Q", divisor: 1e15 },
  ];

  return comparisonScales.map((scale) => {
    const converted = result / scale.divisor;
    const formatted = `${trimNumber(converted)} ${scale.suffix}`;

    return {
      group: "number",
      icon: Icon.ArrowRight,
      title: scale.title,
      value: formatted,
      copyValue: formatted,
      accessories: originalUnit.toLowerCase() === scale.suffix.toLowerCase() ? [{ text: "input scale" }] : undefined,
    };
  });
}
