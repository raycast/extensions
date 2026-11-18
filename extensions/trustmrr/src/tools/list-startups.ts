import { listStartups } from "../lib/api";
import { isCategoryValue, isSortValue, MAX_PAGE_SIZE } from "../lib/startup-filters";

type Input = {
  /** One-based page number. */
  page?: number;
  /** Number of startups per page, up to 10. */
  limit?: number;
  /** TrustMRR category slug, such as "saas" or "developer-tools". */
  category?: string;
  /** Whether to show only startups listed for sale. */
  onSale?: boolean;
  /** Minimum last-30-days revenue in USD cents. For $10,000, pass 1000000. */
  minRevenue?: number;
  /** Sort order, such as "revenue-desc", "growth-desc", or "best-deal". */
  sort?: string;
};

/** List startups from TrustMRR using the requested filters. */
export default async function tool(input: Input) {
  const category = input.category;
  const sort = input.sort;

  if (category !== undefined && !isCategoryValue(category)) {
    throw new Error(`Unknown startup category: ${category}`);
  }
  if (sort !== undefined && !isSortValue(sort)) {
    throw new Error(`Unknown startup sort order: ${sort}`);
  }

  return listStartups({
    page: Math.max(Math.trunc(input.page ?? 1), 1),
    limit: Math.min(Math.max(Math.trunc(input.limit ?? MAX_PAGE_SIZE), 1), MAX_PAGE_SIZE),
    category,
    onSale: input.onSale === undefined ? undefined : input.onSale ? "true" : "false",
    minRevenue: input.minRevenue,
    sort,
  });
}
