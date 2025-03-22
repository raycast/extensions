export function formatNumber(value: number, options = {}) {
  const { decimalLength, leadingZeroLength } = getNumberLength(value);
  const maximumFractionDigits =
    decimalLength >= 4 ? 0 : decimalLength >= 2 ? 2 : decimalLength == 1 ? 4 : leadingZeroLength + 2;
  return value.toLocaleString("en-US", { maximumFractionDigits, ...options });
}

export function formatCurrency(value: number, currency: string) {
  return formatNumber(value, { style: "currency", currency });
}

export function formatPercent(value: number) {
  return value.toLocaleString("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
  });
}

export function formatLargeNumber(value: number) {
  return value.toLocaleString("en-US", {
    notation: "compact",
    compactDisplay: "long",
  });
}

function getNumberLength(value: number) {
  const valueStr = value.toString();
  if (valueStr.includes(".")) {
    const [integerPart, fractionalPart] = valueStr.split(".");
    return {
      decimalLength: integerPart.length,
      fractionLength: fractionalPart.length,
      leadingZeroLength: fractionalPart.match(/^0+/)?.[0].length || 0,
    };
  }
  return {
    decimalLength: valueStr.length,
    fractionLength: 0,
    leadingZeroLength: 0,
  };
}
