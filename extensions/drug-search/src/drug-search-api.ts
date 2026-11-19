import { Result } from "./interfaces";

const API_URL = "https://api.fda.gov/drug/drugsfda.json";
const PAGE_SIZE = 25;
const NAME_FIELDS = [
  "products.brand_name",
  "products.active_ingredients.name",
  "openfda.brand_name",
  "openfda.generic_name",
];

export function buildDrugSearchUrl(search: string, page: number, sort?: string) {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(page * PAGE_SIZE) });
  const name = search.trim().replace(/\s+/g, " ");
  if (name) {
    // openFDA uses Elasticsearch query_string syntax. Quote the whole name and
    // escape quote/backslash so user input cannot introduce fields or operators.
    // https://open.fda.gov/apis/query-syntax/
    const phrase = name.replace(/[\\"]/g, "\\$&");
    params.set("search", NAME_FIELDS.map((field) => `${field}:"${phrase}"`).join(" OR "));
  }
  if (sort) params.set("sort", sort);
  return `${API_URL}?${params}`;
}

export interface DrugSearchPage {
  data: Result[];
  hasMore: boolean;
}

export async function parseDrugSearchResponse(response: Response): Promise<DrugSearchPage> {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`openFDA returned an invalid response (HTTP ${response.status})`);
  }

  if (!response.ok) {
    // A missing endpoint and other NOT_FOUND errors must remain errors.
    if (response.status === 404 && body?.error?.code === "NOT_FOUND" && body.error.message === "No matches found!") {
      return { data: [], hasMore: false };
    }
    throw new Error(`openFDA request failed (HTTP ${response.status}): ${body?.error?.message || response.statusText}`);
  }

  const results = body?.meta?.results;
  if (
    !Array.isArray(body?.results) ||
    !results ||
    !Number.isFinite(results.total) ||
    !Number.isFinite(results.skip) ||
    !Number.isFinite(results.limit)
  ) {
    throw new Error("openFDA returned an invalid search response");
  }
  return { data: body.results, hasMore: results.skip + results.limit < results.total };
}
