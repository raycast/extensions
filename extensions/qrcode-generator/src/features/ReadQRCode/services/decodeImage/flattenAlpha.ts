export function flattenAlpha(data: Buffer): void {
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 255) continue;
    const a = alpha / 255;
    const inv = 1 - a;
    data[i] = Math.round(data[i] * a + 255 * inv);
    data[i + 1] = Math.round(data[i + 1] * a + 255 * inv);
    data[i + 2] = Math.round(data[i + 2] * a + 255 * inv);
    data[i + 3] = 255;
  }
}
