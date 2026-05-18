import Jimp from "jimp";

/**
 * Reads `srcPath`, center-crops to a square, resizes to `size`x`size`,
 * applies a circular alpha mask (transparent outside the circle),
 * and writes the result as PNG to `destPath`.
 */
export async function writeCircularAvatar(srcPath: string, destPath: string, size = 320): Promise<void> {
  const img = await Jimp.read(srcPath);
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const side = Math.min(w, h);
  img.crop(Math.floor((w - side) / 2), Math.floor((h - side) / 2), side, side);
  img.resize(size, size);

  const radius = size / 2;
  const cx = radius;
  const cy = radius;
  const r2 = radius * radius;

  img.scan(0, 0, size, size, function (x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy > r2) {
      this.bitmap.data[idx + 3] = 0; // alpha = 0
    }
  });

  await img.writeAsync(destPath);
}
