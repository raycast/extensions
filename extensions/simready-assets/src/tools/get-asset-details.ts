import { describeFile, SOURCE } from "../lib/ai";
import { contentUrl, downloadCommand, fileGroup, fileUrl, folderUrl, formatBytes, humanize } from "../lib/assets";
import { getAssetDetails } from "../lib/hugging-face";

type Input = {
  /** Exact asset folder ID returned by search-assets, such as "food_produce_banana_m01". Use the ID, not its title or a URL. */
  assetId: string;
};

/** Inspect one asset using its file index and small JSON metadata. Returns URLs and a download command without fetching models, textures, or preview images. */
export default async function getAssetDetailsTool(input: Input) {
  const details = await getAssetDetails(input.assetId);
  const groups = new Map<string, { count: number; sizeBytes: number }>();
  for (const file of details.files) {
    const group = fileGroup(file, details);
    const summary = groups.get(group) ?? { count: 0, sizeBytes: 0 };
    summary.count++;
    summary.sizeBytes += file.size;
    groups.set(group, summary);
  }
  return {
    source: SOURCE,
    id: details.id,
    title: humanize(details.id),
    type: humanize(details.id.split("_")[0]),
    url: folderUrl(details.id),
    fileCount: details.files.length,
    totalSizeBytes: details.totalSize,
    totalSize: formatBytes(details.totalSize),
    license: details.license ?? null,
    licenseUrl: details.licensePath ? fileUrl(details.licensePath) : null,
    previewUrl: details.preview ? contentUrl(details.preview.path) : null,
    modelCount: details.models.length,
    models: details.models.slice(0, 20).map((file) => describeFile(file, details)),
    fileGroups: [...groups].map(([group, summary]) => ({ group, count: summary.count, sizeBytes: summary.sizeBytes })),
    download: {
      command: downloadCommand(details.id),
      shell: process.platform === "win32" ? "PowerShell" : "POSIX shell (macOS/Linux)",
      directory: `./simready-assets/${details.id}/`,
      cliInstallationUrl: "https://huggingface.co/docs/huggingface_hub/en/guides/cli#getting-started",
      note: "Run this command yourself with the Hugging Face CLI installed. It includes only this asset folder. Keep the folder structure: USD models may depend on textures, materials, and payloads. No files have been downloaded by this tool.",
    },
  };
}
