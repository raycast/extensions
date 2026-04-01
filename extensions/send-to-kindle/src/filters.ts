import { LocalStorage } from "@raycast/api";
import { readFile, writeFile } from "fs/promises";

export type DomainFilter = {
  id: string;
  domain: string;
  selector: string;
  coverSelector: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertFilterResult = {
  filter: DomainFilter;
  operation: "created" | "updated";
};

type DomainFilterLike = Partial<DomainFilter> & {
  domain?: unknown;
  selector?: unknown;
  coverSelector?: unknown;
};

export type FilterTransferPayload = {
  format: "send-to-kindle-skill";
  version: 1;
  exportedAt: string;
  filter: Pick<DomainFilter, "domain" | "selector" | "coverSelector">;
};

const STORAGE_KEY = "domain-filters";
const MULTI_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "gov.uk",
  "ac.uk",
  "co.jp",
  "ne.jp",
  "or.jp",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "com.br",
  "com.mx",
  "com.tr",
  "com.cn",
  "com.hk",
  "co.in",
  "co.za",
]);

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

export function extractDomainFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return normalizeDomain(hostname);
  } catch {
    return null;
  }
}

export function extractBaseDomainFromUrl(url?: string): string | null {
  const domain = extractDomainFromUrl(url);
  if (!domain) return null;

  if (isIpAddress(domain) || domain === "localhost") {
    return domain;
  }

  const labels = domain.split(".").filter(Boolean);
  if (labels.length <= 2) return domain;

  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_TLDS.has(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }

  return lastTwo;
}

export function coerceDomainInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (trimmed.includes("://")) {
    try {
      return normalizeDomain(new URL(trimmed).hostname);
    } catch {
      return "";
    }
  }

  const hostname = trimmed.split("/")[0];
  return normalizeDomain(hostname);
}

export function parseCssSelectors(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((selector) => selector.trim())
    .filter(Boolean);
}

function mergeSelectorLists(existing: string, incoming: string): string {
  const merged = new Set([...parseCssSelectors(existing), ...parseCssSelectors(incoming)]);
  return Array.from(merged).join(", ");
}

function isIpAddress(value: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return true;
  return value.includes(":");
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFilter(raw: unknown): DomainFilter | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as DomainFilterLike;
  if (typeof candidate.domain !== "string") return null;

  const selector = typeof candidate.selector === "string" ? candidate.selector.trim() : "";
  const coverSelector = typeof candidate.coverSelector === "string" ? candidate.coverSelector.trim() : "";
  if (!selector && !coverSelector) return null;

  const id = typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : makeId();
  const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString();
  const updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : createdAt;

  return {
    id,
    domain: normalizeDomain(candidate.domain),
    selector,
    coverSelector,
    createdAt,
    updatedAt,
  };
}

async function readFilters(): Promise<DomainFilter[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed.map(sanitizeFilter).filter((filter): filter is DomainFilter => Boolean(filter));
    return sanitized;
  } catch {
    return [];
  }
}

async function writeFilters(filters: DomainFilter[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export async function listFilters(): Promise<DomainFilter[]> {
  const filters = await readFilters();
  return filters.sort(
    (a, b) =>
      a.domain.localeCompare(b.domain) ||
      a.selector.localeCompare(b.selector) ||
      a.coverSelector.localeCompare(b.coverSelector),
  );
}

export async function addFilter(domain: string, selector: string, coverSelector = ""): Promise<UpsertFilterResult> {
  const filters = await readFilters();
  const normalizedDomain = normalizeDomain(domain);
  const normalizedSelector = selector.trim();
  const normalizedCoverSelector = coverSelector.trim();
  const now = new Date().toISOString();
  const existingIndex = filters.findIndex((filter) => filter.domain === normalizedDomain);

  if (existingIndex !== -1) {
    const updatedFilter: DomainFilter = {
      ...filters[existingIndex],
      selector: mergeSelectorLists(filters[existingIndex].selector, normalizedSelector),
      coverSelector: mergeSelectorLists(filters[existingIndex].coverSelector, normalizedCoverSelector),
      updatedAt: now,
    };

    const nextFilters = filters.filter(
      (filter, index) => index === existingIndex || filter.domain !== normalizedDomain,
    );
    nextFilters[existingIndex] = updatedFilter;

    await writeFilters(nextFilters);
    return { filter: updatedFilter, operation: "updated" };
  }

  const newFilter: DomainFilter = {
    id: makeId(),
    domain: normalizedDomain,
    selector: normalizedSelector,
    coverSelector: normalizedCoverSelector,
    createdAt: now,
    updatedAt: now,
  };

  filters.push(newFilter);
  await writeFilters(filters);
  return { filter: newFilter, operation: "created" };
}

export async function updateFilter(
  id: string,
  domain: string,
  selector: string,
  coverSelector = "",
): Promise<DomainFilter | null> {
  const filters = await readFilters();
  const index = filters.findIndex((filter) => filter.id === id);
  if (index === -1) return null;

  const normalizedDomain = normalizeDomain(domain);
  const normalizedSelector = selector.trim();
  const normalizedCoverSelector = coverSelector.trim();
  const now = new Date().toISOString();
  const existingForDomain = filters.find((filter) => filter.id !== id && filter.domain === normalizedDomain);

  if (existingForDomain) {
    const updatedExisting: DomainFilter = {
      ...existingForDomain,
      selector: normalizedSelector,
      coverSelector: normalizedCoverSelector,
      updatedAt: now,
    };

    const next: DomainFilter[] = [];
    for (const filter of filters) {
      if (filter.id === id) continue;
      if (filter.id === existingForDomain.id) {
        next.push(updatedExisting);
        continue;
      }
      if (filter.domain === normalizedDomain) continue;
      next.push(filter);
    }

    await writeFilters(next);
    return updatedExisting;
  }

  const updated: DomainFilter = {
    ...filters[index],
    domain: normalizedDomain,
    selector: normalizedSelector,
    coverSelector: normalizedCoverSelector,
    updatedAt: now,
  };

  const next: DomainFilter[] = [];
  for (const filter of filters) {
    if (filter.id === id) {
      next.push(updated);
      continue;
    }
    if (filter.domain === normalizedDomain) continue;
    next.push(filter);
  }

  await writeFilters(next);
  return updated;
}

export async function deleteFilter(id: string): Promise<void> {
  const filters = await readFilters();
  const next = filters.filter((filter) => filter.id !== id);
  await writeFilters(next);
}

export async function resetCoverSkillsForDomain(domain: string): Promise<number> {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return 0;

  const filters = await readFilters();
  const now = new Date().toISOString();
  let changes = 0;
  const next: DomainFilter[] = [];

  for (const filter of filters) {
    if (filter.domain !== normalizedDomain) {
      next.push(filter);
      continue;
    }

    if (!filter.coverSelector.trim()) {
      next.push(filter);
      continue;
    }

    changes += 1;
    if (filter.selector.trim()) {
      next.push({
        ...filter,
        coverSelector: "",
        updatedAt: now,
      });
    }
  }

  if (changes > 0) {
    await writeFilters(next);
  }

  return changes;
}

export async function resetFilterSkillsForDomain(domain: string): Promise<number> {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return 0;

  const filters = await readFilters();
  const now = new Date().toISOString();
  let changes = 0;
  const next: DomainFilter[] = [];

  for (const filter of filters) {
    if (filter.domain !== normalizedDomain) {
      next.push(filter);
      continue;
    }

    if (!filter.selector.trim()) {
      next.push(filter);
      continue;
    }

    changes += 1;
    if (filter.coverSelector.trim()) {
      next.push({
        ...filter,
        selector: "",
        updatedAt: now,
      });
    }
  }

  if (changes > 0) {
    await writeFilters(next);
  }

  return changes;
}

export async function resetAllSkillsForDomain(domain: string): Promise<number> {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return 0;

  const filters = await readFilters();
  const next = filters.filter((filter) => filter.domain !== normalizedDomain);
  const removed = filters.length - next.length;

  if (removed > 0) {
    await writeFilters(next);
  }

  return removed;
}

export async function getFiltersForDomain(domain: string): Promise<DomainFilter[]> {
  const filters = await readFilters();
  const normalized = normalizeDomain(domain);
  return filters.filter((filter) => filter.domain === normalized || normalized.endsWith(`.${filter.domain}`));
}

export async function exportFilterToPath(
  filePath: string,
  filter: Pick<DomainFilter, "domain" | "selector" | "coverSelector">,
): Promise<void> {
  const sanitized = sanitizeFilter(filter);
  if (!sanitized) {
    throw new Error("Invalid skill data. A domain and at least one CSS field are required.");
  }

  const payload: FilterTransferPayload = {
    format: "send-to-kindle-skill",
    version: 1,
    exportedAt: new Date().toISOString(),
    filter: {
      domain: sanitized.domain,
      selector: sanitized.selector,
      coverSelector: sanitized.coverSelector,
    },
  };

  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function importFilterFromPath(
  filePath: string,
): Promise<Pick<DomainFilter, "domain" | "selector" | "coverSelector">> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as { filter?: unknown } | unknown;
  const maybeFilter =
    parsed && typeof parsed === "object" && "filter" in parsed ? (parsed as { filter?: unknown }).filter : parsed;
  const sanitized = sanitizeFilter(maybeFilter);

  if (!sanitized) {
    throw new Error("Invalid JSON format. Expected one skill with domain and CSS fields.");
  }

  return {
    domain: sanitized.domain,
    selector: sanitized.selector,
    coverSelector: sanitized.coverSelector,
  };
}
