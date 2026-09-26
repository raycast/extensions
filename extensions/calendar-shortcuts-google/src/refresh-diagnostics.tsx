import {
  Action,
  ActionPanel,
  Cache,
  Detail,
  Icon,
  LaunchType,
  getPreferenceValues,
  launchCommand,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isCalendarSetupComplete } from "./lib/calendar-settings";
import { currentGoogleConnectionFingerprint } from "./lib/google";
import { googleOAuth } from "./lib/google-oauth";
import { ScheduleEvent } from "./lib/types";

type Preferences = {
  menuBarMode?: string;
};

type DiagnosticStatus = "pass" | "warn" | "fail";

type DiagnosticResult = {
  status: DiagnosticStatus;
  label: string;
  detail: string;
};

type MenuBarSnapshot = {
  updatedAt: number;
  setupComplete: boolean | null;
  events: ScheduleEvent[];
};

const MENU_BAR_CACHE_KEY_PREFIX = "schedule-snapshot-v3";
const menuBarCache = new Cache({ namespace: "calendar-shortcuts-menu-bar" });

function menuBarCacheKey(): string {
  return `${MENU_BAR_CACHE_KEY_PREFIX}:${currentGoogleConnectionFingerprint()}`;
}

function readMenuBarSnapshot(): MenuBarSnapshot | null {
  try {
    const raw = menuBarCache.get(menuBarCacheKey());
    if (!raw) return null;

    const parsed = JSON.parse(raw) as MenuBarSnapshot;
    if (
      typeof parsed.updatedAt !== "number" ||
      !Array.isArray(parsed.events) ||
      !(
        parsed.setupComplete === true ||
        parsed.setupComplete === false ||
        parsed.setupComplete === null
      )
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function snapshotLooksValid(snapshot: MenuBarSnapshot): boolean {
  return snapshot.events.every(
    (item) =>
      Boolean(item?.calendar?.id) &&
      Boolean(item?.event?.id) &&
      Boolean(item?.event?.start) &&
      Boolean(item?.event?.end),
  );
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForNewSnapshot(
  previousUpdatedAt: number,
  timeoutMs = 12_000,
): Promise<MenuBarSnapshot | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const snapshot = readMenuBarSnapshot();
    if (snapshot && snapshot.updatedAt > previousUpdatedAt) {
      return snapshot;
    }
    await sleep(250);
  }

  return null;
}

function formatAge(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 2) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function iconFor(status: DiagnosticStatus): string {
  if (status === "pass") return "✅";
  if (status === "warn") return "⚠️";
  return "❌";
}

function markdownFor(results: DiagnosticResult[], running: boolean): string {
  const passes = results.filter((result) => result.status === "pass").length;
  const warnings = results.filter((result) => result.status === "warn").length;
  const failures = results.filter((result) => result.status === "fail").length;

  const summary = running
    ? "Running the real Raycast menu-bar refresh path…"
    : failures > 0
      ? `**${failures} runtime check${failures === 1 ? "" : "s"} failed.**`
      : warnings > 0
        ? `**Runtime refresh passed with ${warnings} warning${warnings === 1 ? "" : "s"}.**`
        : `**${passes}/${results.length} runtime checks passed.**`;

  const lines = results.map(
    (result) =>
      `${iconFor(result.status)} **${result.label}**\n\n${result.detail}`,
  );

  return [
    "# Refresh Diagnostics",
    "",
    summary,
    "",
    "This is a **non-destructive runtime test**. It does not create, edit, move, copy, or delete Google Calendar events.",
    "",
    "The permanent `npm test` refresh suite checks that Quick Add, Edit, Move, Copy, Delete, Enabled Calendars and Calendar Settings are wired to the correct refresh path. This command verifies that the shared background Menu Bar refresh path actually runs inside Raycast and rewrites the live account-scoped cache.",
    "",
    ...lines.flatMap((line) => ["---", "", line, ""]),
  ].join("\n");
}

function Command() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(true);
  const [runNumber, setRunNumber] = useState(0);

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    setResults([]);

    const nextResults: DiagnosticResult[] = [];
    const add = (result: DiagnosticResult) => {
      nextResults.push(result);
      setResults([...nextResults]);
    };

    try {
      const preferences = getPreferenceValues<Preferences>();
      const fingerprint = currentGoogleConnectionFingerprint();
      const cacheKey = menuBarCacheKey();

      add({
        status: "pass",
        label: "Native Google connection",
        detail: `Connected OAuth token is available and the Menu Bar is using an account-specific cache key ending in \`${fingerprint}\`.`,
      });

      const setupComplete = await isCalendarSetupComplete();
      add({
        status: setupComplete ? "pass" : "warn",
        label: "Calendar setup state",
        detail: setupComplete
          ? "Calendar setup is complete for the connected Google account."
          : "Calendar setup is not complete for this account, so a refreshed snapshot may intentionally contain no events.",
      });

      if (preferences.menuBarMode === "never") {
        add({
          status: "warn",
          label: "Menu Bar runtime refresh",
          detail:
            "Show Events in Menu Bar is currently set to Never. The refresh engine deliberately skips Google work in this mode, so the live cache rewrite test was not run.",
        });
        return;
      }

      const before = readMenuBarSnapshot();
      add({
        status: before ? "pass" : "warn",
        label: "Existing Menu Bar snapshot",
        detail: before
          ? `Found a valid snapshot with ${before.events.length} cached event${before.events.length === 1 ? "" : "s"}, last updated ${formatAge(before.updatedAt)}.`
          : "No readable snapshot existed before the test. That is okay; the next step should create one.",
      });

      const previousUpdatedAt = before?.updatedAt ?? 0;
      const launchStartedAt = Date.now();

      await launchCommand({
        name: "menu-bar",
        type: LaunchType.Background,
        context: { refreshMode: "full" },
      });

      add({
        status: "pass",
        label: "Background refresh launch",
        detail:
          "Raycast accepted a real background `menu-bar` launch with `refreshMode: full` without throwing an IPC or Worker Unloaded error.",
      });

      const after = await waitForNewSnapshot(previousUpdatedAt);
      if (!after) {
        add({
          status: "fail",
          label: "Live cache rewrite",
          detail:
            "The Menu Bar background command launched, but its account-scoped snapshot did not receive a newer `updatedAt` value within 12 seconds.",
        });
        return;
      }

      const refreshSeconds = Math.max(
        0,
        (after.updatedAt - launchStartedAt) / 1000,
      );
      add({
        status: "pass",
        label: "Live cache rewrite",
        detail: `The real Menu Bar worker rewrote \`${cacheKey}\` with a fresh snapshot containing ${after.events.length} event${after.events.length === 1 ? "" : "s"}. Cache update completed about ${refreshSeconds.toFixed(1)}s after launch.`,
      });

      add({
        status: after.setupComplete === setupComplete ? "pass" : "fail",
        label: "Account/setup consistency",
        detail:
          after.setupComplete === setupComplete
            ? "The refreshed Menu Bar snapshot belongs to the same connected account/setup state as DayCal."
            : "The refreshed Menu Bar snapshot disagrees with the current account setup state.",
      });

      add({
        status: snapshotLooksValid(after) ? "pass" : "fail",
        label: "Refreshed event snapshot",
        detail: snapshotLooksValid(after)
          ? "Every cached event has a calendar ID, event ID, start and end value, so the refreshed snapshot is structurally usable by the Menu Bar."
          : "At least one cached event is missing the identifying/time fields the Menu Bar expects.",
      });
    } catch (error) {
      add({
        status: "fail",
        label: "Runtime diagnostic",
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    void runDiagnostics();
  }, [runDiagnostics, runNumber]);

  const markdown = useMemo(
    () => markdownFor(results, running),
    [results, running],
  );

  return (
    <Detail
      isLoading={running}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Run Diagnostics Again"
            icon={Icon.ArrowClockwise}
            onAction={() => setRunNumber((value) => value + 1)}
          />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(googleOAuth)(Command);
