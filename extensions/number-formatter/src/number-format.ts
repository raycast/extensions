export type ParseResult =
  { ok: true; value: number } | { ok: false; reason: "empty" | "invalid" | "out-of-range" | "precision-loss" };

export type FormatKind = "grouped" | "compact-short" | "compact-long" | "scientific";

export type FormattedNumber = {
  kind: FormatKind;
  label: string;
  value: string;
};

function localeSeparators(locale: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1_000.1);

  return {
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
    group: parts.find((part) => part.type === "group")?.value ?? ",",
  };
}

function isConventionalGroup(mantissa: string, separator: string) {
  const unsigned = mantissa.replace(/^[+-]/, "");
  const groups = unsigned.split(separator);

  return (
    groups.length > 1 && /^\d{1,3}$/.test(groups[0] ?? "") && groups.slice(1).every((group) => /^\d{3}$/.test(group))
  );
}

function normalizeMantissa(mantissa: string, locale: string): string | null {
  const withoutSpaceGroups = mantissa.replace(/[\s\u00a0\u202f'’]/g, "");
  const dots = [...withoutSpaceGroups.matchAll(/\./g)].map((match) => match.index);
  const commas = [...withoutSpaceGroups.matchAll(/,/g)].map((match) => match.index);

  if (dots.length > 0 && commas.length > 0) {
    const decimal = dots.at(-1)! > commas.at(-1)! ? "." : ",";
    const group = decimal === "." ? "," : ".";

    if (withoutSpaceGroups.split(decimal).length !== 2) return null;
    return withoutSpaceGroups.replaceAll(group, "").replace(decimal, ".");
  }

  const separator = dots.length > 0 ? "." : commas.length > 0 ? "," : null;
  if (!separator) return withoutSpaceGroups;

  const count = separator === "." ? dots.length : commas.length;
  const { decimal, group } = localeSeparators(locale);

  if (separator === decimal) {
    if (count !== 1) return null;
    return withoutSpaceGroups.replace(separator, ".");
  }

  if (separator === group && (count > 1 || isConventionalGroup(withoutSpaceGroups, separator))) {
    return withoutSpaceGroups.replaceAll(separator, "");
  }

  if (count === 1) return withoutSpaceGroups.replace(separator, ".");

  return null;
}

function significantDigitCount(canonical: string) {
  const mantissa = canonical.replace(/^[+-]/, "").split(/[eE]/)[0] ?? "";
  const significant = mantissa.replace(".", "").replace(/^0+/, "").replace(/0+$/, "");
  return significant.length || 1;
}

export function parseNumber(input: string, locale: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  const match = trimmed.match(/^([^eE]+)([eE][+-]?\d+)?$/);
  if (!match) return { ok: false, reason: "invalid" };

  const mantissa = normalizeMantissa(match[1] ?? "", locale);
  if (!mantissa) return { ok: false, reason: "invalid" };

  const canonical = `${mantissa}${match[2] ?? ""}`;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(canonical)) {
    return { ok: false, reason: "invalid" };
  }

  if (significantDigitCount(canonical) > 15) return { ok: false, reason: "precision-loss" };

  const value = Number(canonical);
  if (!Number.isFinite(value)) return { ok: false, reason: "out-of-range" };

  return { ok: true, value };
}

function fractionDigits(value: number, detail: number) {
  const absolute = Math.abs(value);
  if (absolute === 0 || absolute >= 1) return detail;

  const leadingZeros = Math.max(0, Math.ceil(-Math.log10(absolute)) - 1);
  return Math.min(20, leadingZeros + Math.max(1, detail));
}

function format(locale: string, value: number, options: Intl.NumberFormatOptions) {
  const formatted = new Intl.NumberFormat(locale, options).format(value);
  return locale.toLowerCase() === "de-ch" ? formatted.replaceAll("'", "’") : formatted;
}

export function formatNumber(value: number, locale: string, decimalDetail: number): FormattedNumber[] {
  const detail = Math.max(0, Math.min(6, decimalDetail));
  const adaptiveDetail = fractionDigits(value, detail);

  return [
    {
      kind: "grouped",
      label: "Grouped Number",
      value: format(locale, value, { maximumFractionDigits: adaptiveDetail, useGrouping: true }),
    },
    {
      kind: "compact-short",
      label: "Compact Short",
      value: format(locale, value, {
        compactDisplay: "short",
        maximumFractionDigits: adaptiveDetail,
        notation: "compact",
      }),
    },
    {
      kind: "compact-long",
      label: "Compact Long",
      value: format(locale, value, {
        compactDisplay: "long",
        maximumFractionDigits: adaptiveDetail,
        notation: "compact",
      }),
    },
    {
      kind: "scientific",
      label: "Scientific",
      value: format(locale, value, { maximumFractionDigits: detail, notation: "scientific" }),
    },
  ];
}
