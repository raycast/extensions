export interface HistoryEntry {
  doi: string;
  bib: string;
  fetchedAt: string;
}

const HISTORY_CAP = 50;

const DOI_URL_PREFIXES = ["https://doi.org/", "http://doi.org/", "https://dx.doi.org/", "http://dx.doi.org/"];

export function extractDoi(raw: string): string {
  let doi = raw.trim();
  for (const prefix of DOI_URL_PREFIXES) {
    if (doi.startsWith(prefix)) {
      doi = doi.slice(prefix.length);
      break;
    }
  }
  return doi;
}

export function looksLikeDoi(text: string): boolean {
  const trimmed = text.trim();
  return /^(https?:\/\/)?(dx\.)?doi\.org\/10\.\d+\/|^10\.\d+\//.test(trimmed);
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

  for (const char of bodyRaw) {
    if (char === "{") depth++;
    else if (char === "}") depth--;
    else if (char === "," && depth === 0) {
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
