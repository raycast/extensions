export const DATASET_ID = "nvidia/simready-assets";
export const DATASET_URL = `https://huggingface.co/datasets/${DATASET_ID}`;
export const TREE_API_URL = `https://huggingface.co/api/datasets/${DATASET_ID}/tree/main`;

export type RepositoryEntry = { type: "file" | "directory"; path: string; size: number };
export type Asset = { id: string; title: string; category: string; searchText: string };
export type AssetDetails = {
  id: string;
  files: RepositoryEntry[];
  models: RepositoryEntry[];
  preview?: RepositoryEntry;
  license?: string;
  licensePath?: string;
  totalSize: number;
};

export function encodePath(path: string): string {
  return path
    .split("/")
    .map((part) =>
      encodeURIComponent(part).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`),
    )
    .join("/");
}

export function folderUrl(path = ""): string {
  return `${DATASET_URL}/tree/main${path ? `/${encodePath(path)}` : ""}`;
}

export function fileUrl(path: string): string {
  return `${DATASET_URL}/blob/main/${encodePath(path)}`;
}

export function contentUrl(path: string, download = false): string {
  return `${DATASET_URL}/resolve/main/${encodePath(path)}${download ? "?download=true" : ""}`;
}

export function humanize(value: string): string {
  const words = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function normalizeSearch(value: string): string {
  return humanize(value).toLowerCase().replace(/\s+/g, " ").trim();
}

export function createCatalog(entries: RepositoryEntry[]): Asset[] {
  return entries
    .filter((entry) => entry.type === "directory" && !entry.path.includes("/") && !entry.path.startsWith("."))
    .map(({ path }) => ({
      id: path,
      title: humanize(path),
      category: humanize(path.split("_")[0]),
      searchText: normalizeSearch(path),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
}

export function searchAssets(assets: Asset[], query: string, category = ""): Asset[] {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  return assets.filter(
    (asset) => (!category || asset.category === category) && terms.every((term) => asset.searchText.includes(term)),
  );
}

export function summarizeAsset(
  id: string,
  entries: RepositoryEntry[],
  rootPaths: string[] = [],
  license?: string,
): AssetDetails {
  const files = entries.filter((entry) => entry.type === "file" && entry.path.startsWith(`${id}/`));
  const declaredModels = files.filter((file) => rootPaths.includes(file.path.slice(id.length + 1)));
  const models = declaredModels.length
    ? declaredModels
    : files.filter((file) => /^(?:simready_usd\/)?[^/]+\.usd[acz]?$/i.test(file.path.slice(id.length + 1)));

  // Only asset thumbnails are previews; texture maps can be very large and are not useful here.
  const previews = files.filter(
    (file) =>
      file.path.startsWith(`${id}/simready_usd/.thumbs/`) &&
      /\.(png|jpe?g|webp)$/i.test(file.path) &&
      file.size > 0 &&
      file.size <= 2 * 1024 * 1024,
  );
  const previewRank = (file: RepositoryEntry) => {
    if (/_transparent\.png$/i.test(file.path)) return 0;
    if (/_thumbnail\.png$/i.test(file.path)) return 1;
    if (/\.usd[acz]?\.png$/i.test(file.path)) return 2;
    return 3;
  };
  previews.sort((a, b) => previewRank(a) - previewRank(b) || a.size - b.size);

  return {
    id,
    files,
    models,
    preview: previews[0],
    license,
    licensePath: files.find((file) => /(?:^|\/)licen[sc]e(?:\.[^/]*)?$/i.test(file.path))?.path,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: unit ? 1 : 0 }).format(bytes / 1024 ** unit)} ${units[unit]}`;
}

export function downloadCommand(assetId: string, platform = process.platform): string {
  // Quote the literal folder glob for the user's shell. Never run it from the extension.
  const pattern = `${assetId.replace(/[[\]*?]/g, (char) => (char === "[" ? "[[]" : `[${char}]`))}/**`;
  const quoted = platform === "win32" ? `'${pattern.replace(/'/g, "''")}'` : `'${pattern.replace(/'/g, `'"'"'`)}'`;
  return `hf download ${DATASET_ID} --repo-type dataset --revision main --include ${quoted} --local-dir ./simready-assets`;
}

export function fileGroup(file: RepositoryEntry, details: AssetDetails): string {
  if (details.models.some((model) => model.path === file.path)) return "Models";
  if (file.path.includes("/.thumbs/")) return "Previews";
  if (file.path.includes("/Textures/")) return "Textures";
  if (file.path.includes("/payloads/")) return "Payloads";
  if (file.path.includes("/source_assets/")) return "Source Files";
  return "Metadata";
}
