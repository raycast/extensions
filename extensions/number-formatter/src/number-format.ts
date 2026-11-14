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
  const groups = mantissa.split(separator);

  return (
    groups.length > 1 && /^\d{1,3}$/.test(groups[0] ?? "") && groups.slice(1).every((group) => /^\d{3}$/.test(group))
  );
}

function normalizeGroupedInteger(integer: string): string | null {
  const separators = [...new Set(integer.match(/[., ']/g) ?? [])];
  if (separators.length > 1) return null;
  if (separators.length === 0) return /^\d*$/.test(integer) ? integer : null;

  const separator = separators[0]!;
  return isConventionalGroup(integer, separator) ? integer.replaceAll(separator, "") : null;
}

function normalizeMantissa(mantissa: string, locale: string): string | null {
  const sign = mantissa.match(/^[+-]/)?.[0] ?? "";
  const unsigned = sign ? mantissa.slice(1) : mantissa;
  const normalizedGroups = unsigned.replace(/[\s\u00a0\u202f]/g, " ").replaceAll("’", "'");
  const dots = [...normalizedGroups.matchAll(/\./g)].map((match) => match.index);
  const commas = [...normalizedGroups.matchAll(/,/g)].map((match) => match.index);
  let decimalSeparator: "." | "," | null = null;

  if (dots.length > 0 && commas.length > 0) {
    decimalSeparator = dots.at(-1)! > commas.at(-1)! ? "." : ",";
    const decimalCount = decimalSeparator === "." ? dots.length : commas.length;
    if (decimalCount !== 1) return null;
  } else {
    const separator = dots.length > 0 ? "." : commas.length > 0 ? "," : null;

    if (separator) {
      const count = separator === "." ? dots.length : commas.length;
      const { decimal, group } = localeSeparators(locale);

      if (separator === decimal) {
        if (count !== 1) return null;
        decimalSeparator = separator;
      } else if (separator === group && (count > 1 || isConventionalGroup(normalizedGroups, separator))) {
        decimalSeparator = null;
      } else if (count === 1) {
        decimalSeparator = separator;
      } else {
        return null;
      }
    }
  }

  if (!decimalSeparator) {
    const integer = normalizeGroupedInteger(normalizedGroups);
    return integer === null ? null : `${sign}${integer}`;
  }

  const [integerPart, fractionPart, extraPart] = normalizedGroups.split(decimalSeparator);
  if (extraPart !== undefined || !/^\d*$/.test(fractionPart ?? "")) return null;

  const integer = normalizeGroupedInteger(integerPart ?? "");
  return integer === null ? null : `${sign}${integer}.${fractionPart}`;
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
  if (value === 0 && /[1-9]/.test(canonical.split(/[eE]/)[0] ?? "")) {
    return { ok: false, reason: "out-of-range" };
  }

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
