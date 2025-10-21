export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);
};

export const sanitizePath = (pathComponent: string): string => {
  return pathComponent.replace(/\.\./g, "").replace(/[/\\]/g, "");
};

export const isValidId = (id: string): boolean => {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 255;
};

export const escapeShellPath = (filePath: string): string => {
  return filePath.replace(/'/g, "'\\''");
};
