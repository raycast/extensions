// Pure-JS scanline rasterizer. Opaque interiors use typed-array fills;
// only the two boundary pixels per scanline need antialiasing/blending.
export type RGB = readonly [number, number, number];
export class Raster {
  readonly rgba: Uint8Array;
  private readonly words: Uint32Array;
  readonly width: number;
  readonly height: number;
  constructor(width: number, height: number, background: RGB) {
    this.width = width;
    this.height = height;
    this.rgba = new Uint8Array(width * height * 4);
    this.words = new Uint32Array(this.rgba.buffer);
    this.words.fill(this.packed(background));
  }
  private packed([r, g, b]: RGB) {
    return (255 << 24) | (b << 16) | (g << 8) | r;
  }
  blend(x: number, y: number, color: RGB, alpha: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || alpha <= 0)
      return;
    const offset = (y * this.width + x) * 4;
    for (let c = 0; c < 3; c++)
      this.rgba[offset + c] = Math.round(
        this.rgba[offset + c] * (1 - alpha) + color[c] * alpha,
      );
  }
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    top: RGB,
    bottom: RGB = top,
  ) {
    radius = Math.min(radius, w / 2, h / 2);
    for (
      let row = Math.max(0, Math.floor(y));
      row < Math.min(this.height, Math.ceil(y + h));
      row++
    ) {
      const dy = Math.max(
        0,
        Math.abs(row + 0.5 - y - h / 2) - (h / 2 - radius),
      );
      const inset = radius - Math.sqrt(Math.max(0, radius * radius - dy * dy));
      const left = x + inset,
        right = x + w - inset;
      const first = Math.max(0, Math.ceil(left)),
        last = Math.min(this.width, Math.floor(right));
      const t = Math.max(0, Math.min(1, (row + 0.5 - y) / h));
      const color = top.map((v, i) =>
        Math.round(v + (bottom[i] - v) * t),
      ) as unknown as RGB;
      const vertical = Math.min(1, row + 1 - y, y + h - row);
      if (vertical >= 1 && last > first)
        this.words.fill(
          this.packed(color),
          row * this.width + first,
          row * this.width + last,
        );
      else
        for (let col = first; col < last; col++)
          this.blend(col, row, color, vertical);
      this.blend(first - 1, row, color, Math.max(0, first - left) * vertical);
      this.blend(last, row, color, Math.max(0, right - last) * vertical);
    }
  }
  mask(
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: Uint8Array,
    color: RGB,
  ) {
    x = Math.round(x);
    y = Math.round(y);
    for (let row = 0; row < height; row++)
      for (let col = 0; col < width; col++) {
        const a = alpha[row * width + col];
        if (a) this.blend(x + col, y + row, color, a / 255);
      }
  }
}

// The fixed palette is shared by all frames. RGB565 only indexes the memo;
// nearest-color decisions use the original 8-bit channels, as gifenc does.
export function paletteMapper(palette: number[][]) {
  const memo = new Int16Array(65536).fill(-1);
  return (rgba: Uint8Array) => {
    const indexed = new Uint8Array(rgba.length / 4);
    for (let i = 0, pixel = 0; i < rgba.length; i += 4, pixel++) {
      const r = rgba[i],
        g = rgba[i + 1],
        b = rgba[i + 2];
      const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
      let best = memo[key];
      if (best < 0) {
        let distance = Infinity;
        for (let j = 0; j < palette.length; j++) {
          const p = palette[j];
          const d = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
          if (d < distance) {
            distance = d;
            best = j;
          }
        }
        memo[key] = best;
      }
      indexed[pixel] = best;
    }
    return indexed;
  };
}
