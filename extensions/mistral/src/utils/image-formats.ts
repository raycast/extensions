export type ImageFormat = {
  readonly extensions: readonly string[];
  readonly mimeType: string;
};

export type SupportedFormats = {
  readonly [key: string]: ImageFormat;
};

export const IMAGE_FORMATS: SupportedFormats = {
  jpeg: { extensions: ["jpg", "jpeg"], mimeType: "image/jpeg" },
  png: { extensions: ["png"], mimeType: "image/png" },
  webp: { extensions: ["webp"], mimeType: "image/webp" },
} as const;

export const FORMATS_REQUIRING_CONVERSION: readonly string[] = ["heic", "heif"] as const;

export function getMimeTypeFromExtension(ext: string): string | null {
  const format = Object.values(IMAGE_FORMATS).find((fmt) => fmt.extensions.includes(ext.toLowerCase()));
  return format?.mimeType || null;
}
