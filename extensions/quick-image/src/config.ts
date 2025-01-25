export const DEFAULT_OPERATION = "jpg";

export const FORMAT_OPTIONS = {
  webp: {
    quality: 80,
  },
  jpg: {
    quality: 80,
    progressive: true,
    mozjpeg: true,
  },
  png: {
    compressionLevel: 6,
    quality: 100,
    progressive: true,
  },
};

export type FormatName = keyof typeof FORMAT_OPTIONS;

export const FORMAT_ALIAS: Record<string, string> = {
  jpg: "jpeg",
};

export const SIZE_MAP = {
  xl: "1920x",
  l: "1280x",
  m: "640x",
  s: "320x",
};

export type SizeName = keyof typeof SIZE_MAP;
