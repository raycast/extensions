export function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function truncateFileName(fileName: string, maxLength = 24): string {
  if (fileName.length <= maxLength) return fileName;
  const ext = fileName.includes(".") ? "." + fileName.split(".").pop() : "";
  const base = fileName.slice(0, maxLength - ext.length - 3);
  return `${base}...${ext}`;
}

export function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + "...";
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff"];

export function getFileIcon(
  fileName: string,
  url: string,
): { source: string } | { source: { light: string; dark: string } } {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return { source: url };
  }
  if (ext === "pdf") {
    return { source: { light: "pdf.png", dark: "pdf.png" } };
  }
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) {
    return { source: { light: "zip.png", dark: "zip.png" } };
  }
  return { source: { light: "file.png", dark: "file.png" } };
}
