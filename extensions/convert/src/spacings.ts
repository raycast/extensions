// tailwind spacings as of v3.3.2
export const spacing = {
  "0": {
    size: 0,
    pixels: 0,
    slug: "0",
  },
  px: {
    size: 1,
    pixels: 1,
    slug: "px",
  },
  "0.5": {
    size: 0.125,
    pixels: 2,
    slug: "0.5",
  },
  "1": {
    size: 0.25,
    pixels: 4,
    slug: "1",
  },
  "1.5": {
    size: 0.375,
    pixels: 6,
    slug: "1.5",
  },
  "2": {
    size: 0.5,
    pixels: 8,
    slug: "2",
  },
  "2.5": {
    size: 0.625,
    pixels: 10,
    slug: "2.5",
  },
  "3": {
    size: 0.75,
    pixels: 12,
    slug: "3",
  },
  "3.5": {
    size: 0.875,
    pixels: 14,
    slug: "3.5",
  },
  "4": {
    size: 1,
    pixels: 16,
    slug: "4",
  },
  "5": {
    size: 1.25,
    pixels: 20,
    slug: "5",
  },
  "6": {
    size: 1.5,
    pixels: 24,
    slug: "6",
  },
  "7": {
    size: 1.75,
    pixels: 28,
    slug: "7",
  },
  "8": {
    size: 2,
    pixels: 32,
    slug: "8",
  },
  "9": {
    size: 2.25,
    pixels: 36,
    slug: "9",
  },
  "10": {
    size: 2.5,
    pixels: 40,
    slug: "10",
  },
  "11": {
    size: 2.75,
    pixels: 44,
    slug: "11",
  },
  "12": {
    size: 3,
    pixels: 48,
    slug: "12",
  },
  "14": {
    size: 3.5,
    pixels: 56,
    slug: "14",
  },
  "16": {
    size: 4,
    pixels: 64,
    slug: "16",
  },
  "20": {
    size: 5,
    pixels: 80,
    slug: "20",
  },
  "24": {
    size: 6,
    pixels: 96,
    slug: "24",
  },
  "28": {
    size: 7,
    pixels: 112,
    slug: "28",
  },
  "32": {
    size: 8,
    pixels: 128,
    slug: "32",
  },
  "36": {
    size: 9,
    pixels: 144,
    slug: "36",
  },
  "40": {
    size: 10,
    pixels: 160,
    slug: "40",
  },
  "44": {
    size: 11,
    pixels: 176,
    slug: "44",
  },
  "48": {
    size: 12,
    pixels: 192,
    slug: "48",
  },
  "52": {
    size: 13,
    pixels: 208,
    slug: "52",
  },
  "56": {
    size: 14,
    pixels: 224,
    slug: "56",
  },
  "60": {
    size: 15,
    pixels: 240,
    slug: "60",
  },
  "64": {
    size: 16,
    pixels: 256,
    slug: "64",
  },
  "72": {
    size: 18,
    pixels: 288,
    slug: "72",
  },
  "80": {
    size: 20,
    pixels: 320,
    slug: "80",
  },
  "96": {
    size: 24,
    pixels: 384,
    slug: "96",
  },
};

export function PXtoTailwindSpacing(value: number): string {
  const spacingValue = Object.values(spacing).find((s) => s.pixels === value);
  if (spacingValue) {
    return spacingValue.slug;
  }
  return `[${value}px]`;
}

export function REMtoTailwindSpacing(value: number): string {
  console.log(value);
  const spacingValue = Object.values(spacing).find((s) => s.size === value);
  if (spacingValue) {
    return spacingValue.slug;
  }
  return `[${value}rem]`;
}
