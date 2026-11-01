import { paginate, SOURCE, validatePagination } from "../lib/ai";
import { folderUrl, normalizeSearch, searchAssets } from "../lib/assets";
import { getCatalog } from "../lib/hugging-face";

type Input = {
  /** Short keywords such as "coffee cup" or "banana m01". All words must match the asset name. Omit to browse all assets. */
  query?: string;
  /** Exact asset type from list-asset-types, such as "Food" or "Body Part". Matching is case-insensitive. Omit for all types. */
  type?: string;
  /** Number of results to return, from 1 to 50. Defaults to 20. */
  limit?: number;
  /** Zero-based result offset. Defaults to 0. Pass nextOffset from the previous result to load more with the same filters. */
  offset?: number;
};

/** Search the complete NVIDIA SimReady Assets catalog using only the folder index. No asset content is downloaded. */
export default async function searchAssetsTool(input: Input) {
  const query = input.query?.trim() ?? "";
  const type = normalizeSearch(input.type ?? "");
  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;
  validatePagination(limit, offset, 50);

  const catalog = await getCatalog();
  const matches = searchAssets(catalog, query).filter((asset) => !type || normalizeSearch(asset.category) === type);
  const page = paginate(matches, limit, offset);
  return {
    source: SOURCE,
    query,
    type: input.type?.trim() || null,
    catalogSize: catalog.length,
    ...page,
    results: page.results.map((asset) => ({
      id: asset.id,
      title: asset.title,
      type: asset.category,
      url: folderUrl(asset.id),
    })),
  };
}
