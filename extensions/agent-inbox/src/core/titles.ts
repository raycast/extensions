import { Adapter } from "./adapters/types";
import { Store } from "./db";
import { Session, SessionTitle } from "./types";

const key = (s: { agent: string; sessionId: string }) => `${s.agent}:${s.sessionId}`;

/** Refresh labels independently of state collection. Sources never choose by title. */
export class TitleSynchronizer {
  constructor(
    private readonly store: Store,
    private readonly adapters: () => Adapter[],
  ) {}

  async refresh(sessions: Session[]): Promise<Session[]> {
    if (!sessions.length) return sessions;
    const adapters = this.adapters();
    const results = await Promise.allSettled(
      adapters.map((adapter) => {
        const owned = sessions.filter((s) => s.agent === adapter.id);
        return owned.length && adapter.source?.titles ? adapter.source.titles(owned) : Promise.resolve([]);
      }),
    );
    const known = new Set(sessions.map(key));
    const observations = new Map<string, SessionTitle>();
    for (const [index, result] of results.entries()) {
      if (result.status !== "fulfilled") continue;
      for (const o of result.value) {
        const title = o.title
          .replace(/\p{Cc}/gu, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (o.agent !== adapters[index].id || !known.has(key(o)) || !title || !Number.isFinite(o.observedAt) || o.observedAt < 0) continue;
        const existing = observations.get(key(o));
        if (!existing || o.observedAt > existing.observedAt) observations.set(key(o), { ...o, title });
      }
    }
    const persisted = await this.store.syncTitles([...observations.values()]);
    // Another process may have already observed a newer rename. Use the committed name.
    for (const title of persisted) observations.set(key(title), title);
    return sessions.map((session) => {
      const observation = observations.get(key(session));
      return observation && observation.observedAt >= (session.titleObservedAt ?? 0)
        ? { ...session, title: observation.title, titleObservedAt: observation.observedAt, titleSource: observation.source }
        : session;
    });
  }
}
