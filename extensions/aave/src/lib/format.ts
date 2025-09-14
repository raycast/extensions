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
