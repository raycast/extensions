import { environment, getApplications, getPreferenceValues, showHUD } from "@raycast/api";
import { execFile } from "child_process";
import * as path from "path";
import { setTimeout as sleep } from "timers/promises";
import { promisify } from "util";
import { collectorPaths as pathsUnder, collectorStatus as statusOf, ensureCollector } from "./collector.ts";
import { builtinsAsLogged, readCategories } from "./focusCategories.ts";
import type { Category } from "./focusSetup.ts";
import { learnGoalBlocks as learn } from "./goalBlocks.ts";
import { claim, hudText, moments } from "./moments.ts";
import { parsePreferences, type Preferences as ParsedPreferences } from "./prefs.ts";
import { CALENDAR_WEEKS, computeStats } from "./stats.ts";
import { LocalSessionStore } from "./store.ts";
import { liveSources, markQuickStart, syncIfStale as staleSync, syncSessions as fullSync } from "./sync.ts";
import { tiersFor } from "./theme.ts";

export const SUPPORT_URL = "https://buymeacoffee.com/filipimiparebine";

const SUCCESS_SOUND = path.join(environment.assetsPath, "chime.wav");

const HUD_SHOWS = 4;

const HUD_GAP_MS = 1_000;

const run = promisify(execFile);

async function holdHUD(text: string): Promise<void> {
  for (let i = 0; i < HUD_SHOWS; i++) {
    if (i) await sleep(HUD_GAP_MS);
    await showHUD(text);
  }
}

export const isRaycast2 = Number.parseInt(environment.raycastVersion, 10) >= 2;

export function getPreferences(): ParsedPreferences {
  return parsePreferences(getPreferenceValues<Preferences>());
}

export const store = new LocalSessionStore(environment.supportPath);
export const collectorPaths = () => pathsUnder(environment.supportPath);
export const collectorStatus = () => statusOf(collectorPaths());
export const resumeRecording = () => ensureCollector(collectorPaths());

const installedApps = async () =>
  new Set((await getApplications()).flatMap((app) => (app.bundleId ? [app.bundleId] : [])));

const sources = () => ({
  ...liveSources(collectorPaths()),
  categories: async () => builtinsAsLogged(await readCategories(), await installedApps()),
});

export const syncSessions = () => fullSync(store, sources());
export const syncIfStale = () => staleSync(store, sources());
export const learnGoalBlocks = () => learn(store, isRaycast2 ? async () => null : undefined);

export const rememberQuickStart = (goal: string, categories: Category[]) =>
  store.mutateState((state) => ({
    ...state,
    quickStarts: markQuickStart(state.quickStarts, goal, categories, Date.now()),
  }));

export async function announce(): Promise<void> {
  const prefs = getPreferences();
  const now = new Date();
  const stats = computeStats(await store.all(), {
    weekStartsOn: prefs.weekStartsOn,
    calendarWeeks: CALENDAR_WEEKS,
    now,
  });
  const { announced, pending } = await store.readState();
  const due = moments(stats, prefs.dailyGoal, tiersFor(prefs.leagues), now).filter(
    (m) => !m.reminder || !pending.length,
  );
  const keys = due.map((m) => m.key);
  if (announced && keys.every((key) => announced.includes(key))) return;

  let fresh: string[] = [];
  await store.mutateState((state) => {
    const next = claim(state.announced, keys);
    fresh = next.fresh;
    return { ...state, announced: next.announced };
  });

  const shown = due.filter(
    (m) => !m.quiet && fresh.includes(m.key) && (m.reminder ? prefs.streakReminder : prefs.celebrations),
  );
  if (!shown.length) return;
  const chime = prefs.sound && shown.some((m) => !m.reminder);
  await Promise.all([
    holdHUD(hudText(shown)),
    chime ? run("/usr/bin/afplay", [SUCCESS_SOUND]).catch(() => undefined) : undefined,
  ]);
}
