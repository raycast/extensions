export function formatPaths(paths: string[]): string {
  return paths.map((p) => `@${p}`).join("\n");
}
