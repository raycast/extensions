import type { SearchFilter } from "@/types";

export function transformURL(url: string, params: Record<string, string | number>): string {
  return url.replace(/\{(\w+)\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`;
  });
}

type SectionTitleParams = {
  fetchedCount: number;
  totalCount: number;
};

export function getSectionTitle(filter: SearchFilter | null | undefined, params: SectionTitleParams): string {
  if (filter?.sectionTitle) {
    if (typeof filter.sectionTitle === "string") {
      return filter.sectionTitle;
    } else {
      return filter.sectionTitle(params);
    }
  }
  return `Results (${params.fetchedCount}/${params.totalCount})`;
}
