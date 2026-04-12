export interface ApiEntry {
  id: string;
  name: string;
  provider?: string;
  key: string;
  expiresAt?: string; // ISO date string, e.g. "2026-12-31"
  createdAt: string;
  updatedAt: string;
  tags: string[];
  url?: string;
}

export type ExpiryStatus = "expired" | "expiring-soon" | "active" | "no-expiry";

export function getExpiryStatus(entry: ApiEntry): ExpiryStatus {
  if (!entry.expiresAt) return "no-expiry";
  const now = new Date();
  const expiry = new Date(entry.expiresAt);
  const diffDays = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "expired";
  if (diffDays <= 7) return "expiring-soon";
  return "active";
}

export const STORAGE_KEY = "api-entries";
