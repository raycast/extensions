/**
 * The companies most recently opened, persisted with `LocalStorage`.
 *
 * A pushed view and the root list are separate components in the same command
 * process, and nothing re-runs the root's effects when a pushed view is
 * popped. So the list is held in a module-level cache that both share, and
 * subscribers are notified on write; `LocalStorage` is what carries it between
 * launches. Reading it straight from storage in the root would show a stale
 * list every time someone came back from a company.
 */

import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const STORAGE_KEY = "recently-viewed-companies";
const MAX_RECENT = 10;

export interface RecentCompany {
  companyNumber: string;
  name?: string;
  status?: string;
  /** Epoch milliseconds, used only for ordering. */
  viewedAt: number;
}

let cache: RecentCompany[] | undefined;
const subscribers = new Set<(items: RecentCompany[]) => void>();

function isRecentCompany(value: unknown): value is RecentCompany {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.companyNumber === "string" &&
    typeof candidate.viewedAt === "number"
  );
}

function parse(raw?: string): RecentCompany[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    // Anything written by an older version, or corrupted, is discarded rather
    // than crashing the root command on launch.
    return Array.isArray(parsed) ? parsed.filter(isRecentCompany) : [];
  } catch {
    return [];
  }
}

function publish(items: RecentCompany[]) {
  cache = items;
  for (const notify of subscribers) notify(items);
}

/**
 * Always reads storage rather than trusting the cache. Each Raycast command
 * runs in its own process, so a company opened from Search Officers writes a
 * list this process never saw. The cache is the synchronous first paint; the
 * stored list is the truth.
 */
async function load(): Promise<RecentCompany[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  const items = parse(raw);
  cache = items;
  return items;
}

/**
 * Records a company as viewed, moving it to the front and keeping the list to
 * `MAX_RECENT` entries.
 */
export async function recordViewedCompany(
  company: Omit<RecentCompany, "viewedAt">,
): Promise<void> {
  if (!company.companyNumber) return;
  const existing = await load();
  const next = [
    { ...company, viewedAt: Date.now() },
    ...existing.filter((item) => item.companyNumber !== company.companyNumber),
  ].slice(0, MAX_RECENT);
  publish(next);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearRecentlyViewedCompanies(): Promise<void> {
  publish([]);
  await LocalStorage.removeItem(STORAGE_KEY);
}

/**
 * The recently viewed list, kept in step with writes from pushed views.
 *
 * `isLoading` is separate from an empty list so the caller can tell "nothing
 * viewed yet" from "not read from storage yet" and avoid flashing an empty
 * section on launch.
 */
export function useRecentlyViewedCompanies(): {
  recent: RecentCompany[];
  isLoading: boolean;
} {
  const [items, setItems] = useState<RecentCompany[] | undefined>(cache);

  useEffect(() => {
    let active = true;
    subscribers.add(setItems);
    load()
      .then((loaded) => {
        if (active) setItems(loaded);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
      subscribers.delete(setItems);
    };
  }, []);

  return { recent: items ?? [], isLoading: items === undefined };
}
