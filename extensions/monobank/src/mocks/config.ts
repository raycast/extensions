import { environment } from "@raycast/api";

/** Flip to true to replace monobank requests with mock data. Only takes effect in `npm run dev`. */
const MOCKS_ENABLED = false;

/** Store builds aren't development builds, so mocks can't ship even if `MOCKS_ENABLED` is committed as true. */
export const MOCK_API = MOCKS_ENABLED && environment.isDevelopment;

export const MOCK_CONFIG = {
  /** Random delay per request, in ms, so loading states are visible. */
  latency: [300, 900] as [min: number, max: number],
  /** Replaces the 60s statement rate limit, so the countdown is still testable, just quick. */
  statementRateLimit: 10_000,
  /** Replaces the 60s client-info TTL. */
  clientInfoTtl: 10_000,
  /**
   * Stores the whole history of an account on its first read in each command run, as if "Sync Statements" had just
   * finished, so history-based features (subscriptions, long periods, budgets) work right away and changes to the
   * mock data show up on the next run.
   */
  prefillStatements: true,
  /**
   * Makes every request fail this way. `network` fails all requests, the others only the personal ones
   * (accounts and statements), like the real API.
   */
  error: undefined as undefined | "invalidToken" | "rateLimit" | "server" | "network",
};

if (MOCK_API) {
  console.warn("monobank: using mock API");
}
