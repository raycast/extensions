import type { FigaTag, FigaTagListResponse } from "./api/types";

interface OptionalTags {
  tags?: FigaTag[];
  tagsWarning?: string;
}

export async function loadOptionalTags(request?: Promise<FigaTagListResponse>): Promise<OptionalTags> {
  if (!request) return {};

  try {
    return { tags: (await request).tags };
  } catch {
    return { tagsWarning: "Tags could not be loaded. Refresh to try again." };
  }
}
