export function getRatingColor(rating: number) {
  if (rating >= 9) {
    return "🏆";
  } else if (rating >= 8) {
    return "🟩";
  } else if (rating >= 7) {
    return "🟨";
  } else if (rating >= 6) {
    return "🟧";
  } else if (rating >= 5) {
    return "🟥";
  } else if (rating >= 0) {
    return "🟪";
  } else {
    return "";
  }
}

export function paginateSmart<T>(items: T[]): T[][] {
  const len = items.length;

  let result: T[][] = [];
  let split = 0;

  if (len <= 10) return [items];
  else split = Math.ceil(len / 10);

  const base = Math.floor(len / split);
  const remainder = len % split;
  let start = 0;
  result = Array.from({ length: split }, (_, i) => {
    const size = base + (i < remainder ? 1 : 0);
    const page = items.slice(start, start + size);
    start += size;
    return page;
  });

  return result;
}
