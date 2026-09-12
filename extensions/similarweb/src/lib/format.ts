import type { DisplayRow, NormalizedWebsiteData, SimilarwebResponse, WebsiteSection, WebsiteSnapshot } from "../types";

export function buildWebsiteSections(snapshot: WebsiteSnapshot): WebsiteSection[] {
  const normalized = normalizeWebsiteData(snapshot.data, snapshot.domain);

  return [
    {
      key: "overview",
      title: "Overview",
      subtitle: normalized.title ?? normalized.displayDomain,
      markdown: formatOverviewMarkdown(snapshot, normalized),
    },
    {
      key: "engagement",
      title: "Engagement",
      subtitle: normalized.visits ? formatCompact(normalized.visits) : "No visits found",
      markdown: formatRowsSection("# Engagement", engagementRows(normalized), "No engagement metrics were available."),
    },
    {
      key: "traffic-sources",
      title: "Traffic Sources",
      subtitle: normalized.trafficSources.length ? `${normalized.trafficSources.length} sources` : "No sources found",
      markdown: formatRowsSection(
        "# Traffic Sources",
        normalized.trafficSources,
        "No traffic source data was available.",
      ),
    },
    {
      key: "top-countries",
      title: "Top Countries",
      subtitle: normalized.topCountries.length ? `${normalized.topCountries.length} countries` : "No countries found",
      markdown: formatRowsSection("# Top Countries", normalized.topCountries, "No country-share data was available."),
    },
    {
      key: "top-keywords",
      title: "Top Keywords",
      subtitle: normalized.topKeywords.length ? `${normalized.topKeywords.length} keywords` : "No keywords found",
      markdown: formatRowsSection("# Top Keywords", normalized.topKeywords, "No keyword data was available."),
    },
    {
      key: "ai-traffic",
      title: "AI Traffic",
      subtitle: normalized.aiTraffic.length ? `${normalized.aiTraffic.length} referrers` : "Not present",
      markdown: formatRowsSection(
        "# AI Traffic",
        normalized.aiTraffic,
        "No AI traffic block was present in this snapshot.",
      ),
    },
    {
      key: "metadata",
      title: "Metadata",
      subtitle: snapshot.source,
      markdown: formatMetadataMarkdown(snapshot, normalized),
    },
  ];
}

export function formatWebsiteMarkdown(snapshot: WebsiteSnapshot): string {
  return buildWebsiteSections(snapshot)
    .map((section) => section.markdown)
    .join("\n\n");
}

export function getHistoryAccessoryText(snapshot: WebsiteSnapshot): DisplayRow[] {
  const normalized = normalizeWebsiteData(snapshot.data, snapshot.domain);
  const rows: DisplayRow[] = [];

  if (normalized.globalRank) {
    rows.push({ label: "Global Rank", value: `#${formatNumber(normalized.globalRank)}` });
  }

  const visits = formatVisitsSummary(normalized);
  if (visits !== "Unavailable") {
    rows.push({ label: "Visits", value: visits });
  }

  return rows;
}

export function normalizeWebsiteData(data: SimilarwebResponse, fallbackDomain: string): NormalizedWebsiteData {
  const engagments = asRecord(data.Engagments);
  const globalRank = asRecord(data.GlobalRank);
  const countryRank = asRecord(data.CountryRank);
  const categoryRank = asRecord(data.CategoryRank);

  return {
    displayDomain: asString(data.Domain) ?? fallbackDomain,
    title: asString(data.Title),
    description: asString(data.Description),
    category: asString(data.Category),
    globalRank: asNumber(globalRank?.Rank),
    countryRank: asNumber(countryRank?.Rank),
    countryCode: asString(countryRank?.CountryCode),
    categoryRank: asNumber(categoryRank?.Rank),
    categoryName: asString(categoryRank?.Category),
    visits: asNumber(engagments?.Visits),
    bounceRate: asNumber(engagments?.BounceRate),
    pagesPerVisit: asNumber(engagments?.PagesPerVisit ?? engagments?.PagePerVisit),
    timeOnSite: asNumber(engagments?.TimeOnSite),
    monthlyVisits: normalizeMonthSeries(asRecord(data.EstimatedMonthlyVisits)),
    trafficSources: normalizeShareRecord(data.TrafficSources),
    topCountries: normalizeCountryArray(data.TopCountryShares),
    topKeywords: normalizeKeywordArray(data.TopKeywords),
    aiTraffic: normalizeKeywordArray(data.AiTraffic),
    rawFieldCount: Object.keys(data).length,
  };
}

function formatOverviewMarkdown(snapshot: WebsiteSnapshot, n: NormalizedWebsiteData): string {
  const lines: string[] = [
    `# ${n.displayDomain}`,
    n.title ? `**Title:** ${n.title}` : "",
    n.description ?? "",
    "",
    "## Highlights",
    `- **Visits**: ${formatVisitsSummary(n)}`,
    `- **Global Rank**: ${formatRank(n.globalRank)}`,
    `- **Country Rank**: ${formatRank(n.countryRank, n.countryCode)}`,
    `- **Category Rank**: ${formatRank(n.categoryRank, n.categoryName)}`,
    `- **Category**: ${n.category ?? "Unavailable"}`,
    `- **Fetched**: ${formatTimestamp(snapshot.fetchedAt)}`,
    `- **Source**: ${snapshot.source === "active-tab" ? "Active Tab" : "Argument"}`,
  ];

  if (n.monthlyVisits.length > 0) {
    lines.push("", "## Monthly Visits");
    lines.push(...n.monthlyVisits.map((row) => `- **${row.label}**: ${row.value}`));
  }

  return lines.filter(Boolean).join("\n");
}

function formatMetadataMarkdown(snapshot: WebsiteSnapshot, n: NormalizedWebsiteData): string {
  return [
    "# Metadata",
    `- **Domain**: ${snapshot.domain}`,
    `- **Fetched At**: ${formatTimestamp(snapshot.fetchedAt)}`,
    `- **Source**: ${snapshot.source === "active-tab" ? "Active Tab" : "Argument"}`,
    `- **Top-Level Fields**: ${String(n.rawFieldCount)}`,
  ].join("\n");
}

function engagementRows(n: NormalizedWebsiteData): DisplayRow[] {
  return [
    { label: "Visits", value: formatMaybeCompact(n.visits) },
    { label: "Bounce Rate", value: formatPercent(n.bounceRate) },
    { label: "Pages per Visit", value: formatDecimal(n.pagesPerVisit) },
    { label: "Time on Site", value: formatDuration(n.timeOnSite) },
  ].filter((row) => row.value !== "Unavailable");
}

function formatRowsSection(title: string, rows: DisplayRow[], emptyMessage: string): string {
  if (rows.length === 0) {
    return `${title}\n\n${emptyMessage}`;
  }

  const body = rows
    .map((row) => `- **${row.label}**: ${row.value}${row.details ? ` (${row.details})` : ""}`)
    .join("\n");

  return `${title}\n\n${body}`;
}

function normalizeMonthSeries(value: Record<string, unknown> | undefined): DisplayRow[] {
  if (!value) return [];

  return Object.entries(value)
    .map(([month, visits]) => {
      const numeric = asNumber(visits);
      return numeric === undefined ? undefined : { label: month, value: formatCompact(numeric) };
    })
    .filter((row): row is DisplayRow => Boolean(row))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(-6);
}

function normalizeShareRecord(value: unknown): DisplayRow[] {
  const record = asRecord(value);
  if (!record) return [];

  return Object.entries(record)
    .map(([label, share]) => {
      const numeric = asNumber(share);
      return numeric === undefined ? undefined : { label, value: formatPercent(numeric) };
    })
    .filter((row): row is DisplayRow => Boolean(row))
    .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
}

function normalizeCountryArray(value: unknown): DisplayRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const r = asRecord(item);
      if (!r) return undefined;
      const label = asString(r.CountryCode) ?? asString(r.Country) ?? asNumber(r.Country)?.toString();
      const share = asNumber(r.Value);
      if (!label || share === undefined) return undefined;
      return { label, value: formatPercent(share) };
    })
    .filter((row): row is DisplayRow => Boolean(row))
    .slice(0, 10);
}

function normalizeKeywordArray(value: unknown): DisplayRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const r = asRecord(item);
      if (!r) return undefined;
      const label = asString(r.Name);
      if (!label) return undefined;
      const share = asNumber(r.Value);
      const volume = asNumber(r.Volume) ?? asNumber(r.EstimatedValue);
      const displayValue =
        share !== undefined ? formatPercent(share) : volume !== undefined ? formatNumber(volume) : "Available";
      return { label, value: displayValue };
    })
    .filter((row): row is DisplayRow => Boolean(row))
    .slice(0, 10);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function formatRank(value?: number, context?: string): string {
  if (value === undefined) return "Unavailable";
  return context ? `#${formatNumber(value)} (${context})` : `#${formatNumber(value)}`;
}

function formatVisitsSummary(n: NormalizedWebsiteData): string {
  const last3 = n.monthlyVisits.slice(-3);
  if (last3.length > 0) return last3.map((row) => row.value).join(" \u2022 ");
  return formatMaybeCompact(n.visits);
}

function formatPercent(value?: number): string {
  if (value === undefined) return "Unavailable";
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(2)}%`;
}

function formatDecimal(value?: number): string {
  return value === undefined ? "Unavailable" : value.toFixed(2);
}

function formatDuration(value?: number): string {
  if (value === undefined) return "Unavailable";
  const total = Math.max(0, Math.round(value));
  return `${Math.floor(total / 60)}m ${total % 60}s`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatMaybeCompact(value?: number): string {
  return value === undefined ? "Unavailable" : formatCompact(value);
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  const units: Array<{ threshold: number; suffix: string }> = [
    { threshold: 1e12, suffix: "t" },
    { threshold: 1e9, suffix: "b" },
    { threshold: 1e6, suffix: "m" },
    { threshold: 1e3, suffix: "k" },
  ];

  for (const { threshold, suffix } of units) {
    if (abs >= threshold) {
      return `${sign}${(abs / threshold).toFixed(2)}${suffix}`;
    }
  }

  return formatNumber(value);
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}
