import { SOURCE } from "../lib/ai";
import { normalizeSearch } from "../lib/assets";
import { getCatalog } from "../lib/hugging-face";

type Input = {
  /** Optional text to filter type names, such as "food" or "tool". Omit to list every available type. */
  query?: string;
};

/** List name-derived SimReady asset types and their counts. These are browsing labels, not verified physical properties. */
export default async function listAssetTypes(input: Input) {
  const catalog = await getCatalog();
  const counts = new Map<string, number>();
  for (const asset of catalog) counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
  const terms = normalizeSearch(input.query ?? "")
    .split(" ")
    .filter(Boolean);
  const types = [...counts]
    .filter(([type]) => terms.every((term) => normalizeSearch(type).includes(term)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => ({ type, count }));
  return { source: SOURCE, catalogSize: catalog.length, totalTypes: counts.size, returned: types.length, types };
}
