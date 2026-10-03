import { fetchDownloads, formatBytes } from "../lib/omlx";

export default async function () {
  const downloads = await fetchDownloads();
  if (downloads.length === 0) {
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
  };
}
