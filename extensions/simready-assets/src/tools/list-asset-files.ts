import { describeFile, paginate, SOURCE, validatePagination } from "../lib/ai";
import { fileGroup, folderUrl, normalizeSearch } from "../lib/assets";
import { getAssetDetails } from "../lib/hugging-face";

type Input = {
  /** Exact asset folder ID returned by search-assets, not a title or URL. */
  assetId: string;
  /** Keywords to match in relative file paths, such as "alb png" or "MuJoCo". Omit to browse all files. */
  query?: string;
  /** Optional file group. Models contains root USD files; Payloads contains referenced geometry and physics files. */
  group?: "Models" | "Payloads" | "Textures" | "Source Files" | "Previews" | "Metadata";
  /** Number of files to return, from 1 to 100. Defaults to 50. */
  limit?: number;
  /** Zero-based result offset. Defaults to 0. Use nextOffset with the same asset, query, and group to load more. */
  offset?: number;
};

/** List one asset's files with sizes and verified repository paths. Returns download links only; it does not download files. */
export default async function listAssetFiles(input: Input) {
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  validatePagination(limit, offset, 100);
  const details = await getAssetDetails(input.assetId);
  const terms = normalizeSearch(input.query ?? "")
    .split(" ")
    .filter(Boolean);
  const matches = details.files.filter(
    (file) =>
      (!input.group || fileGroup(file, details) === input.group) &&
      terms.every((term) => normalizeSearch(file.path.slice(details.id.length + 1)).includes(term)),
  );
  const page = paginate(matches, limit, offset);
  return {
    source: SOURCE,
    assetId: details.id,
    assetUrl: folderUrl(details.id),
    fileCount: details.files.length,
    query: input.query?.trim() ?? "",
    group: input.group ?? null,
    ...page,
    results: page.results.map((file) => describeFile(file, details)),
  };
}
