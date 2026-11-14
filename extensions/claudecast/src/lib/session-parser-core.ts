export const METADATA_SOFT_LINE_LIMIT = 50;

export function shouldStopMetadataScan(
  lineCount: number,
  sawUserEntry: boolean,
): boolean {
  return sawUserEntry && lineCount >= METADATA_SOFT_LINE_LIMIT;
}

export function isMissingPathError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
}
