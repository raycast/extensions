import { getUserProfile, getUserStats } from "../api/ticktick";
import { loadSyncData } from "./lib/data";

/**
 * Get TickTick account profile, productivity stats, and a short workspace overview.
 */
export default async function tool() {
  const [profile, stats, sync] = await Promise.all([getUserProfile(), getUserStats(), loadSyncData()]);

  return {
    profile: profile
      ? {
          name: profile.name,
          email: profile.email,
          pro: profile.pro,
          proEndDate: profile.proEndDate,
        }
      : null,
    stats: stats
      ? {
          score: stats.score,
          level: stats.level,
          completedTasks: stats.completedTasks,
          pomoCount: stats.pomoCount,
          pomoDuration: stats.pomoDuration,
        }
      : null,
    overview: {
      activeTasks: sync.tasks.length,
      projects: sync.projects.filter((p) => !p.closed).length,
      tags: sync.tags.length,
      filters: sync.filters.length,
    },
  };
}
