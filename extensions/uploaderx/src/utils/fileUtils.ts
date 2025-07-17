export function truncateFileName(fileName: string, maxLength = 24): string {
  if (fileName.length <= maxLength) return fileName;
  const ext = fileName.includes(".") ? "." + fileName.split(".").pop() : "";
  const base = fileName.slice(0, maxLength - ext.length - 3);
  return `${base}...${ext}`;
}

export function getFileIcon(
  fileName: string,
  url: string,
): { source: string } | { source: { light: string; dark: string } } {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff"].includes(ext)) {
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

export function isImage(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff"].includes(ext);
}
