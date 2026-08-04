export interface SourceFile {
  path: string;
  name: string;
  ext: string;
  size: number;
  birthtime: Date;
  mtime: Date;
}
export function scanSource(
  sourceDir: string,
  opts?: { recursive?: boolean; excludeTopDirs?: Set<string> },
): SourceFile[];
export function scanDest(destDir: string, opts?: { onlyDirs?: Set<string> }): SourceFile[];
