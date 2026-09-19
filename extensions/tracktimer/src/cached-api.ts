import { type ActiveTimer, ApiError, type Client, type Project, type TrackTimerApi } from "./api";
import type { QueryCache } from "./query-cache";

type History = Awaited<ReturnType<TrackTimerApi["getEntries"]>>;
export function cachedApi(api: TrackTimerApi, cache: QueryCache) {
  const cachedTimer = () => {
    const saved = cache.read<ActiveTimer | null>("timer");
    if (!saved) return undefined;
    return saved.data
      ? {
          ...saved.data,
          elapsedSeconds:
            saved.data.elapsedSeconds +
            Math.max(0, Math.floor((Date.now() - saved.updatedAt) / 1000)),
        }
      : null;
  };
  async function read<T>(key: string, ttl: number, loader: () => Promise<T>, force: boolean) {
    try {
      return await cache.fetch(key, ttl, loader, force);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403))
        cache.invalidateAll();
      throw error;
    }
  }
  return {
    async getSummary(timezone: string, force = false) {
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
      const context = `${timezone}:${day}`;
      const saved = cache.read<{ context: string }>("summary");
      const result = await read(
        "summary",
        60_000,
        async () => ({
          context,
          summary: await api.getSummary(timezone),
        }),
        force || saved?.data.context !== context,
      );
      return result.summary;
    },
    cached: {
      timer: cachedTimer,
      entries: () => cache.read<History>("entries")?.data,
      clients: () => cache.read<Client[]>("clients")?.data,
      projects: (clientId: string) => cache.read<Project[]>(`projects:${clientId}`)?.data,
    },
    api: {
      async getTimer(force = false) {
        const result = await read("timer", 15_000, () => api.getTimer(), force);
        const confirmed = cachedTimer();
        return confirmed === undefined ? result : confirmed;
      },
      getEntries: (cursor?: string, force = false) =>
        cursor ? api.getEntries(cursor) : read("entries", 60_000, () => api.getEntries(), force),
      getClients: (force = false) => read("clients", 300_000, () => api.getClients(), force),
      getProjects: (clientId: string, force = false) =>
        read(`projects:${clientId}`, 300_000, () => api.getProjects(clientId), force),
    },
    confirmTimer(timer: ActiveTimer | null) {
      cache.write("timer", timer);
      cache.invalidate("entries");
      cache.invalidate("summary");
    },
    invalidateTimers() {
      cache.invalidate("timer");
      cache.invalidate("entries");
      cache.invalidate("summary");
    },
  };
}
