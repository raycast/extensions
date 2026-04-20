export interface HistoryEntry {
  doi: string;
  bib: string;
  fetchedAt: string;
}

const HISTORY_CAP = 50;

const DOI_URL_PREFIXES = ["https://doi.org/", "http://doi.org/", "https://dx.doi.org/", "http://dx.doi.org/"];

function stripDoiUrlPrefixCaseInsensitive(s: string): string {
  const lower = s.toLowerCase();
  for (const prefix of DOI_URL_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return s.slice(prefix.length);
    }
  }
  return s;
}

/** Conservative normalization: bare DOI, doi.org URLs (any case), optional leading `doi:`. Does not scan arbitrary text. */
export function extractDoi(raw: string): string {
  let doi = raw.trim();
  doi = doi.replace(/^doi:\s*/i, "");
  doi = stripDoiUrlPrefixCaseInsensitive(doi);
  return doi.trim();
}

export function looksLikeDoi(text: string): boolean {
  const normalized = extractDoi(text);
  return /^10\.\d+\//.test(normalized);
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (isNaN(diffMs)) return "unknown";
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
}

export function addToHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const filtered = history.filter((h) => h.doi !== entry.doi);
  const sorted = filtered.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime());
  const updated = [entry, ...sorted];
  return updated.slice(0, HISTORY_CAP);
}

export function removeHistoryEntry(history: HistoryEntry[], doi: string): HistoryEntry[] {
  return history.filter((h) => h.doi !== doi);
}

export function formatBib(raw: string): string {
  const trimmed = raw.trim();
  const headerMatch = trimmed.match(/^(@\w+\{[^,]+),/);
  if (!headerMatch) return trimmed;

  const header = headerMatch[1];
  const bodyStart = headerMatch[0].length;
  const bodyEnd = trimmed.lastIndexOf("}");
  if (bodyEnd <= bodyStart) return trimmed;

  const bodyRaw = trimmed.slice(bodyStart, bodyEnd);
  const fields: string[] = [];
  let current = "";
  let depth = 0;
  let inDoubleQuotedString = false;
  let prevBackslashInString = false;

  for (const char of bodyRaw) {
    if (inDoubleQuotedString) {
      current += char;
      if (prevBackslashInString) {
        prevBackslashInString = false;
        continue;
      }
      if (char === "\\") {
        prevBackslashInString = true;
        continue;
      }
      if (char === '"') {
        inDoubleQuotedString = false;
      }
      continue;
    }

    if (char === '"') {
      inDoubleQuotedString = true;
      current += char;
      continue;
    }
    if (char === "{") {
      depth++;
      current += char;
      continue;
    }
    if (char === "}") {
      depth--;
      current += char;
      continue;
    }
    if (char === "," && depth === 0) {
      const field = current.trim();
      if (field) fields.push(field);
      current = "";
      continue;
    }
    current += char;
  }
  const lastField = current.trim();
  if (lastField) fields.push(lastField);

  const formattedFields = fields.map((f) => `  ${f}`).join(",\n");
  return `${header},\n${formattedFields}\n}`;
}
