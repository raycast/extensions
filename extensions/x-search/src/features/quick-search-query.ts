export function resolveQuickSearchQuery(rootSearchText: string | undefined, argument: string): string {
  if (rootSearchText !== undefined) return rootSearchText.trim();
  return argument.trim();
}
