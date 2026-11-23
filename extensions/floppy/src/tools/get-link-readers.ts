import { getAnalytics } from "../lib/api";

type Input = {
  /** The link_id from search-files or list-recent-links. */
  linkId: string;
};

/** Who read one Floppy link: each person's pages, reading time and last visit. */
export default async function tool({ linkId }: Input) {
  const a = await getAnalytics(linkId);
  return {
    views: a.views,
    people: a.people.map((p) => ({
      who: p.label,
      visits: p.visits,
      pages_reached: p.pages_reached,
      pages_total: p.pages_total,
      completion_percent: Math.round(p.completion * 100),
      reading_seconds: Math.round(p.active_ms / 1000),
      last_seen: p.last_seen,
      device: p.device,
      city: p.city,
      country: p.country,
    })),
  };
}
