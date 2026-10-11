import { fetchDownloads, formatBytes } from "../lib/omlx";

const SOURCE_LABELS: Record<string, string> = {
  huggingface: "Hugging Face",
  modelscope: "ModelScope",
};

export default async function () {
  const { tasks: downloads, errors } = await fetchDownloads();
  const sourceErrors = Object.entries(errors).map(
    ([source, error]) => `${SOURCE_LABELS[source] ?? source}: ${error}`,
  );
  if (downloads.length === 0) {
    if (sourceErrors.length > 0) {
      return {
        downloads: [],
        sourceErrors,
        message: "Some download sources could not be fetched",
      };
    }
    return { downloads: [], message: "No active or recent downloads" };
  }

  return {
    downloads: downloads.map((t) => ({
      taskId: t.task_id,
      repoId: t.repo_id,
      source: t.source,
      status: t.status,
      progress: `${Math.round(t.progress)}%`,
      downloaded: formatBytes(t.downloaded_size),
      totalSize: formatBytes(t.total_size),
      error: t.error || undefined,
    })),
    ...(sourceErrors.length > 0 ? { sourceErrors } : {}),
  };
}
