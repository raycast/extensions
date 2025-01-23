export function formatShortTime(time: number): string {
  const units = "smhdy";
  const rates = [60, 60, 24, 365];
  const numbers = [];

  for (let i = 0; i < rates.length; i++) {
    if (time <= rates[i]) {
      numbers.push(time);
      break;
    }

    numbers.push(time % rates[i]);
    time = Math.floor(time / rates[i]);
  }

  return numbers
    .map((number, index) => {
      return `${number}${units[index]}`;
    })
    .reverse()
    .slice(0, 2)
    .join(" ");
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)} %`;
}

export function formatStorageSize(size: number): string {
  const units = ["K", "M", "G", "T", "P"];
  let unitIndex = -1;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex < 0) {
    return `${size} B`;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}iB`;
}
