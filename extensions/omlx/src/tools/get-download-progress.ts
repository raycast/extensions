import { fetchHfTasks, formatBytes } from "../lib/omlx";

export default async function () {
  const tasks = await fetchHfTasks();
  if (tasks.length === 0) {
    return { downloads: [], message: "No active or recent downloads" };
  }

  return {
    downloads: tasks.map((t) => ({
      taskId: t.task_id,
      repoId: t.repo_id,
      status: t.status,
      progress: `${Math.round(t.progress)}%`,
      downloaded: formatBytes(t.downloaded_size),
      totalSize: formatBytes(t.total_size),
      error: t.error || undefined,
    })),
  };
}
