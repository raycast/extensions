export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatOptionTitle(value: string): string {
  switch (value.toLowerCase()) {
    case "mp4":
      return "MP4";
    case "mov":
      return "MOV";
    case "gif":
      return "GIF";
    case "jpeg":
      return "JPEG";
    case "png":
      return "PNG";
    case "webm":
      return "WebM";
    case "webp":
      return "WebP";
    case "avif":
      return "AVIF";
    case "pdf":
      return "PDF";
    default:
      return titleCase(value);
  }
}
