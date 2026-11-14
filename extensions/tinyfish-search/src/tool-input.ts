import { z } from "zod";
import { DEFAULT_SEARCH_FILTERS, searchFiltersSchema } from "./tinyfish.ts";

export type SearchToolInput = {
  /** Search keywords. */
  query: string;
  /** Why you are searching, up to 2,000 characters. */
  purpose?: string;
  domain_type?: "web" | "news" | "research_paper";
  /** Comma-separated domains to include. */
  include_domains?: string;
  /** Comma-separated domains to exclude. */
  exclude_domains?: string;
  /** Integer minutes, 1–5,256,000. Cannot be combined with dates or research papers. */
  recency_minutes?: number;
  /** YYYY-MM-DD, for web/news only. */
  after_date?: string;
  /** YYYY-MM-DD, for web/news only. */
  before_date?: string;
  /** Inclusive publication year, research papers only. */
  pub_year_min?: number;
  /** Inclusive publication year, research papers only. */
  pub_year_max?: number;
  /** Zero-based result page, 0–10. */
  page?: number;
  /** Country code. Defaults to the extension preference. */
  location?: string;
  /** Language code. Defaults to the extension preference. */
  language?: string;
};

export function parseSearchToolInput(input: SearchToolInput) {
  const query = z.string().trim().min(1).parse(input.query);
  const type = input.domain_type ?? DEFAULT_SEARCH_FILTERS.type;
  const hasDate = input.after_date !== undefined || input.before_date !== undefined;
  if (input.recency_minutes !== undefined && hasDate) throw new Error("Choose either recency_minutes or a date range.");
  if (type === "research_paper" && (hasDate || input.recency_minutes !== undefined))
    throw new Error("Research papers require publication-year filters instead of date or recency filters.");
  if (type !== "research_paper" && (input.pub_year_min !== undefined || input.pub_year_max !== undefined))
    throw new Error("Publication-year filters require research_paper search.");
  const common = {
    type,
    purpose: input.purpose,
    includeDomains: input.include_domains,
    excludeDomains: input.exclude_domains,
  };
  const filters = searchFiltersSchema.parse(
    type === "research_paper"
      ? { ...common, yearFrom: input.pub_year_min, yearTo: input.pub_year_max }
      : {
          ...common,
          time:
            input.recency_minutes !== undefined
              ? { kind: "recent", minutes: input.recency_minutes }
              : hasDate
                ? { kind: "dates", after: input.after_date, before: input.before_date }
                : { kind: "any" },
        },
  );
  return { query, filters, page: input.page, location: input.location, language: input.language };
}
