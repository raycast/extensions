export const FORMATS: Record<
  string,
  { title: string; compressions: { value: string; title: string }[] }
> = {
  exr: {
    title: "EXR",
    compressions: [
      { value: "dwaa", title: "DWAA" },
      { value: "dwab", title: "DWAB" },
      { value: "zip", title: "Zip" },
      { value: "zips", title: "Zips" },
      { value: "rle", title: "RLE" },
      { value: "piz", title: "PIZ" },
      { value: "pxr24", title: "PXR24" },
      { value: "b44", title: "B44" },
      { value: "b44a", title: "B44A" },
      { value: "none", title: "None" },
    ],
  },
  jpg: {
    title: "JPG",
    compressions: [
      { value: "jpeg:100", title: "Best (100)" },
      { value: "jpeg:90", title: "High (90)" },
      { value: "jpeg:80", title: "Good (80)" },
      { value: "jpeg:50", title: "Medium (50)" },
      { value: "jpeg:20", title: "Low (20)" },
    ],
  },
  png: {
    title: "PNG",
    compressions: [
      { value: "zip", title: "Zip" },
      { value: "none", title: "None" },
    ],
  },
  tiff: {
    title: "TIFF",
    compressions: [
      { value: "lzw", title: "LZW" },
      { value: "zip", title: "Zip" },
      { value: "none", title: "None" },
      { value: "packbits", title: "Packbits" },
    ],
  },
  tx: {
    title: "TX (Arnold)",
    compressions: [
      { value: "zip", title: "Zip (Default)" },
      { value: "none", title: "None" },
      { value: "lzw", title: "LZW" },
    ],
  },
  webp: {
    title: "WebP",
    compressions: [
      { value: "lossless", title: "Lossless" },
      { value: "lossy", title: "Lossy" },
    ],
  },
  heic: {
    title: "HEIC",
    compressions: [
      { value: "hevc", title: "HEVC" },
      { value: "none", title: "None" },
    ],
  },
};

export const RESIZE_MODES = [
  { value: "none", title: "None" },
  { value: "scale", title: "Scale Percentage" },
  { value: "width", title: "Set Width" },
  { value: "height", title: "Set Height" },
  { value: "fit", title: "Set Longest Side" },
];

export const FILTER_OPTIONS = [
  { value: "lanczos3", title: "Lanczos3" },
  { value: "cubic", title: "Cubic" },
  { value: "box", title: "Box" },
  { value: "triangle", title: "Triangle" },
];
