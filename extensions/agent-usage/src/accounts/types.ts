// src/accounts/types.ts

import type { UsageState } from "../agents/types";

/** A single named API account entry stored in LocalStorage. */
export interface AccountEntry {
  /** Stable unique identifier — use crypto.randomUUID() or Date.now().toString() */
  id: string;
  /** User-visible label, e.g. "Work", "Personal" */
  label: string;
  /** Raw API token — stored as plaintext in LocalStorage (same as Raycast password prefs) */
  token: string;
  /** Optional provider-specific account scope, e.g. ChatGPT account ID for Codex */
  accountId?: string;
}

/** The per-provider storage key constants. */
export const ACCOUNTS_STORAGE_KEYS = {
  kimi: "kimi-accounts",
  zai: "zai-accounts",
  codex: "codex-accounts",
  synthetic: "synthetic-accounts",
} as const;

export type AccountsProvider = keyof typeof ACCOUNTS_STORAGE_KEYS;

/** One account's resolved usage state, with its display label. */
export interface AccountUsageState<TUsage, TError> extends UsageState<TUsage, TError> {
  accountId: string;
  label: string;
  /** The API token for this account */
  token: string;
  /** True if this account's token matches the one configured in OpenCode */
  isOpenCodeActive?: boolean;
}

/** The full state of a multi-account provider hook. */
export interface AccountsState<TUsage, TError> {
  /** One entry per account; empty while the initial (uncached) fetch is in flight. */
  accounts: AccountUsageState<TUsage, TError>[];
  /** True only when fetching with no accounts to show yet. */
  isLoading: boolean;
  revalidate: () => Promise<void>;
}
