import { listLinks } from "../lib/api";

type Input = {
  /** How many links, 1 to 50. Defaults to 15. */
  limit?: number;
  /** Only links whose name contains this. */
  name?: string;
};

/** The user's newest Floppy links with their view counts. */
export default async function tool({ limit, name }: Input) {
  const n = Math.min(50, Math.max(1, Math.round(limit ?? 15)));
  const links = await listLinks(n, name?.trim() || undefined);
  return links.map((l) => ({
    link_id: l.id,
    name: l.name,
    url: l.url,
    views: l.views,
    shares: l.shares,
    status: l.status,
    created_at: l.created_at,
    expires_at: l.expires_at,
    team: l.team?.name ?? "Personal",
  }));
}
