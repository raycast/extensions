import path from "node:path";

export function isPathAllowedByExtensions(
  filePath: string,
  allowedExtensions: string[],
): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return allowedExtensions.includes(extension);
}

export function assertPathAllowedByExtensions(
  filePath: string,
  allowedExtensions: string[],
): void {
  if (!isPathAllowedByExtensions(filePath, allowedExtensions)) {
    throw new Error(
      `Blocked by extension filter: '${filePath}' is not in your allowed extensions. Allowed: ${allowedExtensions.join(", ")}`,
    );
  }
}
