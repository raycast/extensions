export function formatApy(value: number) {
  if (value === 0) {
    return "0%";
  }

  return (value * 100).toFixed(2) + "%";
}

export function formatCompactNumber(value: number) {
  return value.toLocaleString("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  });
}

export function titleCase(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function formatMarketName(value: string) {
  const str = titleCase(value).replace("Aave ", "");

  const regex = /^(V\d+)\s+(.+)$/;
  const match = str.match(regex);

  if (match) {
    // match[1] is the version (V3), match[2] is the rest
    return `${match[2]} ${match[1]}`;
  }

  // Return original string if no match
  return str;
}
