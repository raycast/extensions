import { execFile } from "child_process";
import { homedir } from "os";
import { UsageLimitData, UsageLimitDataSchema } from "../types/usage-types";
import { getLimitRows } from "./limit-rows";

export type UsageLimitsResult =
  | { status: "ok"; data: UsageLimitData }
  | { status: "rate_limited"; retryAfterMs: number | null }
  | { status: "error"; message: string };

type BrimResource = { unit?: string; used?: number; resetsAt?: string | null };
type BrimAccount = { stale?: boolean; fetchedAt?: string; resources?: Record<string, BrimResource> };
type BrimOutput = { providers?: Record<string, BrimAccount> };

const HELPER_PATHS = [
  "/usr/local/bin/brim",
  `${homedir()}/Applications/Brim.app/Contents/Helpers/brim`,
  "/Applications/Brim.app/Contents/Helpers/brim",
];

const OPEN_BRIM = "Open Brim and add your Claude account.";

const runHelper = (path: string) =>
  new Promise<{ code: number | string | null; stdout: string }>((resolve) => {
    execFile(path, ["claude"], { timeout: 5000 }, (error, stdout) =>
      resolve({ code: error ? (error.code ?? 1) : 0, stdout }),
    );
  });

const claudeWindow = (resource?: BrimResource) =>
  resource?.unit === "percent" && typeof resource.used === "number"
    ? { utilization: resource.used, resets_at: resource.resetsAt ?? null }
    : null;

/** Brim's `claude` readings in the shape Anthropic's usage API returns, which every view here renders. */
export const parseBrimOutput = (output: string): UsageLimitsResult => {
  let parsed: BrimOutput;
  try {
    parsed = JSON.parse(output) as BrimOutput;
  } catch {
    return { status: "error", message: "Brim returned something unreadable." };
  }
  // ponytail: the first Claude account wins. Add a preference if several ever need telling apart.
  const account = Object.values(parsed.providers ?? {}).find((entry) => entry.resources);
  if (!account?.resources) return { status: "error", message: `Brim has no Claude reading yet. ${OPEN_BRIM}` };
  if (account.stale) {
    const at = account.fetchedAt ? new Date(account.fetchedAt).toLocaleTimeString() : "a while ago";
    return { status: "error", message: `Brim's last Claude reading is from ${at}. Check that Brim is running.` };
  }
  const { session, weekly, sonnet, fable } = account.resources;
  const fableWindow = claudeWindow(fable);
  const result = UsageLimitDataSchema.safeParse({
    five_hour: claudeWindow(session),
    seven_day: claudeWindow(weekly),
    seven_day_sonnet: claudeWindow(sonnet),
    limits: fableWindow
      ? [
          {
            kind: "weekly_scoped",
            group: "weekly",
            percent: fableWindow.utilization,
            resets_at: fableWindow.resets_at,
            scope: { model: { display_name: "Fable" } },
          },
        ]
      : [],
  });
  return result.success && getLimitRows(result.data).length > 0
    ? { status: "ok", data: result.data }
    : { status: "error", message: "Brim's Claude reading has no limits in it." };
};

/** Reads what Brim last fetched, so this never sends a request to Anthropic and can't be rate limited. */
export const fetchClaudeUsageLimits = async (): Promise<UsageLimitsResult> => {
  for (const path of HELPER_PATHS) {
    const { code, stdout } = await runHelper(path);
    if (code === "ENOENT") continue;
    if (code === 0) return parseBrimOutput(stdout);
    if (code === 2 || code === 4) return { status: "error", message: `Brim has no Claude reading yet. ${OPEN_BRIM}` };
    return { status: "error", message: `Brim's helper failed (${code}).` };
  }
  return { status: "error", message: "Brim isn't installed. Put Brim.app in Applications." };
};
