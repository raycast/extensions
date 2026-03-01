/**
 * Common utility functions shared by all shader processors
 */

// Hash function for pseudo-random generation (JavaScript version of hash21)
export function hash21(p: [number, number]): number {
  let x = (p[0] * 233.34) % 1 || 0;
  let y = (p[1] * 851.73) % 1 || 0;
  x = (x + x * x + 23.45) % 1 || 0;
  y = (y + y * y + 23.45) % 1 || 0;
  return (x * y) % 1 || 0;
}

// Improved noise function for grain effect - uses multiple hash layers to avoid patterns
export function grainNoise(x: number, y: number, channel: number = 0): number {
  // Scale coordinates to break up patterns - use small prime numbers for better distribution
  const scale1 = 0.1031; // Small prime-based scale
  const scale2 = 0.0973; // Different small prime-based scale

  // Different coefficients for different channels to avoid correlation
  const coeffs = [
    [233.34, 851.73],
    [127.13, 467.89],
    [311.57, 193.21],
  ];

  const [c1, c2] = coeffs[channel % 3];

  // Scale and hash coordinates with multiple layers
  let fx = x * scale1;
  let fy = y * scale2;

  // First hash layer
  fx = (fx * c1 + fy * c2) % 1 || 0;
  fy = (fx * c2 + fy * c1) % 1 || 0;

  // Second hash layer with different coefficients
  let h1 = (fx * 12.9898 + fy * 78.233) % 1 || 0;
  let h2 = (fx * 37.7193 + fy * 61.237) % 1 || 0;

  // Third layer for better distribution
  h1 = (h1 * 43758.5453 + channel * 17.7) % 1 || 0;
  h2 = (h2 * 31937.123 + channel * 23.1) % 1 || 0;

  // Combine with sine for smoother transitions
  const sine = Math.sin(h1 * Math.PI * 2) * 0.15;
  const noise = (h1 * 0.6 + h2 * 0.3 + sine) % 1 || 0;

  return noise;
}

// Clamp value between 0 and 1
export function saturate(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// Compute luminance from RGB
export function luminance(r: number, g: number, b: number): number {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

// 4x4 Bayer dithering matrix (values 0-15, not normalized)
// This matches the standard Bayer matrix from Wikipedia
const BAYER_MATRIX_RAW = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function bayer4(x: number, y: number): number {
  const bx = Math.floor(x) % 4;
  const by = Math.floor(y) % 4;
  // Return value in range 0-15 (not normalized)
  return BAYER_MATRIX_RAW[by * 4 + bx];
}

// Floyd-Steinberg style pattern (simplified 2x2)
export function fs2(x: number, y: number): number {
  const fx = Math.floor(x) % 2;
  const fy = Math.floor(y) % 2;
  // Pattern: [0, 0.75; 0.5, 0.25]
  if (fx === 0 && fy === 0) return 0.0;
  if (fx === 1 && fy === 0) return 0.75;
  if (fx === 0 && fy === 1) return 0.5;
  return 0.25;
}

export function randomDither(x: number, y: number): number {
  return hash21([x, y]);
}

export function getPatternValue(pattern: number, x: number, y: number): number {
  switch (pattern) {
    case 0: // Floyd-Steinberg
      return fs2(x, y);
    case 1: // Bayer
      return bayer4(x, y);
    case 2: // Random
      return randomDither(x, y);
    default:
      return 0;
  }
}

// RGB to YIQ color space conversion
export function rgbToYiq(r: number, g: number, b: number): [number, number, number] {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const i = 0.5959 * r - 0.2744 * g - 0.3216 * b;
  const q = 0.2115 * r - 0.5229 * g + 0.3114 * b;
  return [y, i, q];
}

export function yiqToRgb(y: number, i: number, q: number): [number, number, number] {
  const r = y + 0.9563 * i + 0.621 * q;
  const g = y - 0.2721 * i - 0.6474 * q;
  const b = y - 1.107 * i + 1.7046 * q;
  return [saturate(r), saturate(g), saturate(b)];
}

// Hue rotation using YIQ color space
export function hueShift(r: number, g: number, b: number, angleDeg: number): [number, number, number] {
  const angle = (angleDeg * Math.PI) / 180.0;
  const [y, i, q] = rgbToYiq(r, g, b);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const newI = i * cosA - q * sinA;
  const newQ = i * sinA + q * cosA;
  return yiqToRgb(y, newI, newQ);
}

/**
 * Apply Gaussian blur to an image using optimized two-pass algorithm
 * This is a more reliable and memory-efficient blur implementation that works with jimp 1.x
 * Uses separable Gaussian blur (horizontal then vertical) for better performance
 */
export async function applyBlur(
  image: {
    width: number;
    height: number;
    getPixelColor: (x: number, y: number) => number;
    setPixelColor: (color: number, x: number, y: number) => void;
  },
  radius: number,
  intToRGBA: (color: number) => { r: number; g: number; b: number; a: number },
  rgbaToInt: (r: number, g: number, b: number, a: number) => number,
): Promise<void> {
  if (radius <= 0) return;

  const width = image.width;
  const height = image.height;

  // Limit radius for performance and prevent memory issues
  const maxRadius = Math.min(radius, 30);
  const sigma = Math.max(0.5, maxRadius / 2);
  const kernelSize = Math.min(Math.ceil(maxRadius * 2) * 2 + 1, 61); // Max 61x61 kernel, odd size

  // Generate 1D Gaussian kernel (for separable blur)
  const kernel: number[] = [];
  let kernelSum = 0;
  const center = Math.floor(kernelSize / 2);

  for (let i = 0; i < kernelSize; i++) {
    const dx = i - center;
    const weight = Math.exp(-(dx * dx) / (2 * sigma * sigma));
    kernel.push(weight);
    kernelSum += weight;
  }

  // Normalize kernel
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= kernelSum;
  }

  const horizontalBlur = new Uint8ClampedArray(width * height * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0;

      for (let kx = 0; kx < kernelSize; kx++) {
        const px = x + kx - center;
        const clampedX = Math.max(0, Math.min(width - 1, px));

        const pixelColor = image.getPixelColor(clampedX, y);
        const rgba = intToRGBA(pixelColor);
        const weight = kernel[kx];

        r += rgba.r * weight;
        g += rgba.g * weight;
        b += rgba.b * weight;
      }

      const idx = (y * width + x) * 3;
      horizontalBlur[idx] = Math.round(Math.max(0, Math.min(255, r)));
      horizontalBlur[idx + 1] = Math.round(Math.max(0, Math.min(255, g)));
      horizontalBlur[idx + 2] = Math.round(Math.max(0, Math.min(255, b)));
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0;

      for (let ky = 0; ky < kernelSize; ky++) {
        const py = y + ky - center;
        const clampedY = Math.max(0, Math.min(height - 1, py));

        const idx = (clampedY * width + x) * 3;
        const weight = kernel[ky];

        r += horizontalBlur[idx] * weight;
        g += horizontalBlur[idx + 1] * weight;
        b += horizontalBlur[idx + 2] * weight;
      }

      image.setPixelColor(
        rgbaToInt(
          Math.round(Math.max(0, Math.min(255, r))),
          Math.round(Math.max(0, Math.min(255, g))),
          Math.round(Math.max(0, Math.min(255, b))),
          255,
        ),
        x,
        y,
      );
    }
  }
}
