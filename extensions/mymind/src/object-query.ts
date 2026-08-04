export type TypeFilter = "all" | "image" | "article" | "note" | "video" | "pdf";

export function buildObjectQuery(searchText: string, typeFilter: TypeFilter, prefix?: string): string | undefined {
  const parts = [
    prefix?.trim() || undefined,
    typeFilter !== "all" ? `type:${typeFilter}` : undefined,
    searchText.trim() || undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" && ") : undefined;
}
