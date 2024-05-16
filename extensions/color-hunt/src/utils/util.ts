export function* eachHex(id: string) {
  for (let i = 0; i < id.length; i += 6) yield id.slice(i, i + 6).toUpperCase();
}

export function hexToRgb(hex: string) {
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}
