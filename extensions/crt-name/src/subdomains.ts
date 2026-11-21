export type SubdomainRecord = {
  firstSeen: string | null;
  subdomain: string;
};

export type SortOrder = "first-seen-ascending" | "first-seen-descending" | "alphabetical";

function firstSeenTimestamp(value: string | null): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return NaN;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return NaN;
  // Date.parse rolls impossible calendar dates (such as February 30) into the next month.
  const calendarDate = value.slice(0, 10);
  if (new Date(`${calendarDate}T00:00:00Z`).toISOString().slice(0, 10) !== calendarDate) return NaN;
  return timestamp;
}

// Keep wildcard patterns distinct from concrete hostnames; they do not prove a host exists.
export function normalizeRecords(records: SubdomainRecord[]): SubdomainRecord[] {
  const unique = new Map<string, SubdomainRecord>();
  for (const record of records) {
    const subdomain = record.subdomain.trim().toLowerCase().replace(/\.$/, "");
    if (!subdomain) continue;
    const timestamp = firstSeenTimestamp(record.firstSeen);
    const firstSeen = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
    const previous = unique.get(subdomain);
    if (!previous || (firstSeen && (!previous.firstSeen || firstSeen < previous.firstSeen))) {
      unique.set(subdomain, { subdomain, firstSeen });
    }
  }
  return [...unique.values()];
}

export function sortSubdomains(records: SubdomainRecord[], sort: SortOrder): SubdomainRecord[] {
  return [...records].sort((left, right) => {
    const alphabetical = left.subdomain.localeCompare(right.subdomain, "en");
    if (sort === "alphabetical") return alphabetical;

    const leftTime = firstSeenTimestamp(left.firstSeen);
    const rightTime = firstSeenTimestamp(right.firstSeen);
    if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return alphabetical;
    if (!Number.isFinite(leftTime)) return 1;
    if (!Number.isFinite(rightTime)) return -1;
    const direction = sort === "first-seen-descending" ? -1 : 1;
    return direction * (leftTime - rightTime) || alphabetical;
  });
}

export function filterSubdomains(records: SubdomainRecord[], query: string): SubdomainRecord[] {
  const contains = query.trim().toLowerCase();
  return contains ? records.filter((record) => record.subdomain.toLowerCase().includes(contains)) : records;
}

export function subdomainsToClipboard(records: SubdomainRecord[]): string {
  return records.map((record) => record.subdomain).join("\n");
}
