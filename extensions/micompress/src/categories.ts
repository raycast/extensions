// File extension -> MiCompress category. Mirrors services/formatDetector.js.
const EXT_CATEGORY: Record<string, string> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  gif: "image",
  bmp: "image",
  tiff: "image",
  tif: "image",
  avif: "image",
  svg: "image",
  heic: "image",
  heif: "image",
  ico: "image",
  psd: "image",
  dng: "image",
  raw: "image",
  cr2: "image",
  arw: "image",
  nef: "image",
  mp4: "video",
  mov: "video",
  avi: "video",
  mkv: "video",
  webm: "video",
  mpeg: "video",
  mpg: "video",
  m4v: "video",
  wmv: "video",
  flv: "video",
  "3gp": "video",
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  ogg: "audio",
  m4a: "audio",
  aac: "audio",
  wma: "audio",
  opus: "audio",
  pdf: "pdf",
  csv: "document",
  json: "document",
  xml: "document",
  md: "document",
  odt: "document",
  ods: "document",
  docx: "document",
  doc: "document",
  ppt: "document",
  pptx: "document",
  xls: "document",
  xlsx: "document",
  epub: "document",
  html: "document",
  htm: "document",
  hwp: "document",
  txt: "document",
  rtf: "document",
  zip: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  tgz: "archive",
  rar: "archive",
};

const CATEGORY_PATH: Record<string, string> = {
  image: "image-compressors",
  video: "video-compressors",
  audio: "audio-compressors",
  document: "document-compressors",
  pdf: "pdf-compressors",
  archive: "archive-compressors",
};

export function extOf(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(filename || "");
  return m ? m[1].toLowerCase() : "";
}
export function categoryFor(filename: string): string | null {
  return EXT_CATEGORY[extOf(filename)] || null;
}
export function endpointPath(category: string): string | null {
  return CATEGORY_PATH[category] || null;
}
