import { SITE_BASE_URL } from "../shared";

export async function fetchDesignMd(slug: string): Promise<string> {
  const url = `${SITE_BASE_URL}/design-md/${slug}/DESIGN.md`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch DESIGN.md for ${slug}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export async function fetchDownloadCount(slug: string): Promise<number | null> {
  const url = `${SITE_BASE_URL}/api/cli/downloads?brand=${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; downloadCount?: number };
    if (!body.ok || typeof body.downloadCount !== "number") return null;
    return body.downloadCount;
  } catch {
    return null;
  }
}
