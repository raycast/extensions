const TRACKING_PARAMETERS = new Set(["fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "ck_subscriber_id"]);

export function normalizeCoolSiteUrl(value: string): string {
  const url = new URL(value.trim());

  for (const key of Array.from(url.searchParams.keys())) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  if (url.hash === "#") url.hash = "";
  return url.toString();
}

export function normalizeCoolSiteTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
