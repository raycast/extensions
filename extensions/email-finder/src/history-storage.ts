import { LocalStorage } from "@raycast/api";
import type { EnrichedData } from "./email-finder";

// * Types
export interface SearchHistoryEntry {
  id: string;
  type: "email";
  firstName: string;
  lastName: string;
  domain: string;
  createdAt: string; // ISO string
  status: "success" | "error";
  email?: string;
  error?: string;
  enrichedData?: EnrichedData;
}

// * Employee data for caching
export interface CachedEmployee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  departments: string[];
  linkedinUrl?: string;
  location?: string;
  seniority?: string;
}

export interface CompanySearchHistoryEntry {
  id: string;
  type: "company";
  companyName: string;
  domain: string;
  confidenceScore: number;
  logoUrl?: string;
  createdAt: string; // ISO string
  employees?: CachedEmployee[];
  totalPages?: number;
  currentPage?: number;
  totalEmployees?: number;
}

export type HistoryEntry = SearchHistoryEntry | CompanySearchHistoryEntry;

// * Constants
const STORAGE_KEY = "search-history";
const COMPANY_STORAGE_KEY = "company-search-history";
const MAX_ENTRIES = 100;

// * Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// * Load all history entries
export async function loadSearchHistory(): Promise<SearchHistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SearchHistoryEntry[];
  } catch (e) {
    console.error("Failed to parse search history:", e);
    return [];
  }
}

// * Save history entries (internal)
async function saveSearchHistory(entries: SearchHistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// * Add a new entry (prepends, keeps bounded to MAX_ENTRIES)
export async function addSearchHistoryEntry(
  entry: Omit<SearchHistoryEntry, "id" | "createdAt" | "type">,
): Promise<SearchHistoryEntry> {
  const entries = await loadSearchHistory();
  const newEntry: SearchHistoryEntry = {
    ...entry,
    type: "email",
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  // Prepend and limit
  const updated = [newEntry, ...entries].slice(0, MAX_ENTRIES);
  await saveSearchHistory(updated);
  return newEntry;
}

// * Remove an entry by ID
export async function removeSearchHistoryEntry(id: string): Promise<void> {
  const entries = await loadSearchHistory();
  const updated = entries.filter((e) => e.id !== id);
  await saveSearchHistory(updated);
}

// * Clear all history
export async function clearSearchHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

// * =============================================
// * Company Search History Functions
// * =============================================

// * Load all company search history entries
export async function loadCompanySearchHistory(): Promise<CompanySearchHistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(COMPANY_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CompanySearchHistoryEntry[];
  } catch (e) {
    console.error("Failed to parse company search history:", e);
    return [];
  }
}

// * Save company search history entries (internal)
async function saveCompanySearchHistory(entries: CompanySearchHistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(entries));
}

// * Add a new company search entry
export async function addCompanySearchHistoryEntry(
  entry: Omit<CompanySearchHistoryEntry, "id" | "createdAt" | "type">,
): Promise<CompanySearchHistoryEntry> {
  const entries = await loadCompanySearchHistory();
  const newEntry: CompanySearchHistoryEntry = {
    ...entry,
    type: "company",
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  // Prepend and limit
  const updated = [newEntry, ...entries].slice(0, MAX_ENTRIES);
  await saveCompanySearchHistory(updated);
  return newEntry;
}

// * Remove a company search entry by ID
export async function removeCompanySearchHistoryEntry(id: string): Promise<void> {
  const entries = await loadCompanySearchHistory();
  const updated = entries.filter((e) => e.id !== id);
  await saveCompanySearchHistory(updated);
}

// * Update a company search entry (e.g., add employees)
export async function updateCompanySearchHistoryEntry(
  id: string,
  updates: Partial<Omit<CompanySearchHistoryEntry, "id" | "type" | "createdAt">>,
): Promise<void> {
  const entries = await loadCompanySearchHistory();
  const updated = entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
  await saveCompanySearchHistory(updated);
}

// * Clear all company search history
export async function clearCompanySearchHistory(): Promise<void> {
  await LocalStorage.removeItem(COMPANY_STORAGE_KEY);
}

// * Load all history (combined email + company, sorted by date)
export async function loadAllHistory(): Promise<HistoryEntry[]> {
  const [emailEntries, companyEntries] = await Promise.all([loadSearchHistory(), loadCompanySearchHistory()]);

  // Add type to legacy email entries that don't have it
  const typedEmailEntries = emailEntries.map((e) => ({ ...e, type: "email" as const }));

  // Combine and sort by createdAt descending
  const combined = [...typedEmailEntries, ...companyEntries];
  combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return combined;
}
