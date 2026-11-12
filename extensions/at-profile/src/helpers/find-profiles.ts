import { countOf } from "@chrismessina/raycast-kit/plural";
import { logger } from "@chrismessina/raycast-logger";
import type { CheckResult, CheckTarget } from "../catalog/types";
import { getAppEntries } from "./apps";
import { recordSearch, saveFindings } from "./findings";
import {
  buildSearchEntries,
  identities,
  runSearch,
  SEARCH_CONCURRENCY,
  SearchEntry,
  SearchMode,
  SearchOutcome,
} from "./search";
import { cleanProfile, tryBuildAppProfileUrl } from "./url";

/**
 * One search outside the Find Profile view, for the AI tool. Keeps the findings and records the search in History,
 * like the view does, so the view and History show what the AI found.
 */

export interface FoundProfiles {
  profile: string;
  mode: SearchMode;
  rows: (SearchEntry & { outcome: SearchOutcome; url?: string })[];
  durationMs: number;
}

/**
 * @throws when the username is empty
 */
export async function findProfiles(
  username: string,
  options: {
    mode?: SearchMode;
    includeNsfw?: boolean;
    check?: (target: CheckTarget, username: string, options: { signal?: AbortSignal }) => Promise<CheckResult>;
  } = {},
): Promise<FoundProfiles> {
  const { mode = "default", includeNsfw = false, check } = options;
  const profile = cleanProfile(username);
  if (!profile) throw new Error("Give a username to look for");

  const entries = buildSearchEntries({ mode, apps: await getAppEntries(), showNsfw: includeNsfw });
  const outcomes = new Map<string, SearchOutcome>();
  // Recorded while the search runs, as the view does
  const recorded = recordSearch(profile).catch((error) =>
    logger.warn("[Find] Couldn't record the search in History", error),
  );
  const startedAt = Date.now();
  await runSearch(entries, profile, {
    concurrency: SEARCH_CONCURRENCY[mode],
    check,
    onOutcome: (key, outcome) => outcomes.set(key, outcome),
  });
  const finishedAt = Date.now();

  saveFindings({
    profile,
    mode,
    finishedAt,
    durationMs: finishedAt - startedAt,
    total: entries.length,
    canceled: false,
    outcomes: Object.fromEntries(outcomes),
    checked: identities(entries),
  });
  await recorded;

  const rows = entries.flatMap((entry) => {
    const outcome = outcomes.get(entry.key);
    return outcome ? [{ ...entry, outcome, url: tryBuildAppProfileUrl(entry, profile) }] : [];
  });
  return { profile, mode, rows, durationMs: finishedAt - startedAt };
}

/**
 * The findings as text for the AI: every found profile with its URL first, then what couldn't be checked
 */
export function describeFindings(found: FoundProfiles): string {
  const { profile, rows } = found;
  const where = (...statuses: SearchOutcome["status"][]) => rows.filter((row) => statuses.includes(row.outcome.status));
  const names = (list: typeof rows) => list.map((row) => row.name).join(", ");

  const profiles = where("found").filter((row) => row.url);
  const taken = where("found").filter((row) => !row.url);
  const answered = where("found", "not-found").length;
  const lines: string[] = [
    profiles.length > 0
      ? `@${profile} has a profile on ${profiles.length} of ${countOf(rows.length, "site")}:`
      : `No profile for @${profile} on the ${countOf(answered, "site")} that answered.`,
    ...profiles.map((row) => `- ${row.name}: ${row.url}`),
  ];

  const sections: [string, typeof rows][] = [
    ["Username taken, but the site has no profile page", taken],
    ["Couldn't check, the site refused or didn't answer (open the profile to see)", where("blocked", "error")],
    ["Not checked, these sites can't be checked (open the profile to see)", where("unchecked")],
    ["Not a valid username on", where("invalid")],
  ];
  for (const [label, list] of sections) {
    if (list.length > 0) lines.push("", `${label}: ${names(list)}`);
  }
  lines.push("", `Not found on ${countOf(where("not-found").length, "site")}.`);
  return lines.join("\n");
}
