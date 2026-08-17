import type { SkillSort } from "./api";

export type SkillSearchMode = "keyword" | "semantic";

export interface SearchSkillsInput {
  cursor?: string;
  limit?: number;
  query?: string;
  searchMode: SkillSearchMode;
  sort?: SkillSort;
}

interface SearchSkillsRequestBody {
  cursor?: string;
  limit: number;
  query?: string;
  searchMode: SkillSearchMode;
  sort?: SkillSort;
}

export const buildSearchSkillsBody = (input: SearchSkillsInput): SearchSkillsRequestBody => {
  const query = input.query?.trim();

  return {
    limit: input.limit ?? 25,
    ...(input.cursor ? { cursor: input.cursor } : {}),
    ...(query ? { query } : {}),
    searchMode: input.searchMode,
    ...(input.sort ? { sort: input.sort } : {}),
  };
};
