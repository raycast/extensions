import { liveThreads, threadMarkdown, type LiveThread } from "./amp";

export type Portal = { title: string; url: string };
export type OrbPortals = { thread: LiveThread; portals: Portal[] };

/** Portal hosts embed the thread's UUID in base36: t-<25 chars>-p<port>.onamp.dev. */
export function portalHostPrefix(threadID: string): string {
  const hex = threadID.replace(/^T-/, "").replace(/-/g, "");
  return `t-${BigInt(`0x${hex}`).toString(36).padStart(25, "0")}-p`;
}

/** Finds the portal URLs of one thread's orb that its transcript mentions, newest first. */
export function portalsInTranscript(threadID: string, markdown: string): Portal[] {
  const prefix = portalHostPrefix(threadID);
  const pattern = new RegExp(
    `(?:\\[([^\\]\\n]{1,80})\\]\\()?(https://${prefix}(\\d+)\\.onamp\\.dev)(/[^\\s)"'<>\\]\`]*)?`,
    "g",
  );
  const byOrigin = new Map<string, Portal>();
  for (const m of markdown.matchAll(pattern)) {
    const [, label, origin, port] = m;
    const named = label && !label.startsWith("http") ? label : undefined;
    // Keep the latest link text seen for a portal; bare mentions only move it to the top.
    const title = named ?? byOrigin.get(origin)?.title ?? `Port ${port}`;
    byOrigin.delete(origin);
    byOrigin.set(origin, { title, url: `${origin}/` });
  }
  return [...byOrigin.values()].reverse();
}

/**
 * Amp has no command that lists portals, so read the transcripts of threads whose orbs are
 * connected and pick out URLs on their own portal hosts. Portals the agent never printed, and
 * custom portal hostnames, don't show up.
 */
export async function lookUpPortals(): Promise<OrbPortals[]> {
  const live = (await liveThreads()).filter((t) => t.executorConnected);
  const results = await Promise.all(
    live.map(async (thread) => {
      try {
        return { thread, portals: portalsInTranscript(thread.id, await threadMarkdown(thread.id)) };
      } catch {
        return { thread, portals: [] };
      }
    }),
  );
  return results.filter((r) => r.portals.length);
}
