import assert from "node:assert/strict";
import test from "node:test";
import { buildPulseBoardMarkdown } from "./pulse-board-presenter";
import { DashboardSnapshot, MenuBarSnapshot } from "./types";

function createDashboardSnapshot(): DashboardSnapshot {
  return {
    baseUrl: "https://selemene.tryambakam.space",
    hasCredentials: true,
    cacheState: "fresh",
    source: "live",
    health: {
      status: "ok",
      version: "3.0.0",
      uptimeSeconds: 120,
      enginesLoaded: 16,
      workflowsLoaded: 6,
      fetchedAt: "2026-04-22T12:00:00Z",
    },
    profile: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Witness User",
      tier: "pro",
      consciousnessLevel: 3,
      experiencePoints: 120,
      birthDate: "1991-08-13",
      birthTime: "13:31",
      birthLocation: {
        latitude: 12.9716,
        longitude: 77.5946,
        name: "Bengaluru, India",
      },
      timezone: "Asia/Kolkata",
      preferences: {},
      fetchedAt: "2026-04-22T12:00:00Z",
    },
    usage: undefined,
    workflows: [],
    engines: [],
    readings: [],
    readingStats: [],
    rateLimit: {},
    syncIssues: [],
    timestamps: {
      lastSyncAt: "2026-04-22T12:15:00Z",
    },
  };
}

function withFixedNow<T>(iso: string, run: () => T): T {
  const realNow = Date.now;
  Date.now = () => new Date(iso).getTime();

  try {
    return run();
  } finally {
    Date.now = realNow;
  }
}

test("buildPulseBoardMarkdown mirrors the cached menu bar pulse into full dashboard sections", () => {
  const snapshot: MenuBarSnapshot = {
    dashboard: createDashboardSnapshot(),
    syncIssues: [],
    insights: {
      vedicClock: {
        kind: "vedicClock",
        engineId: "vedic-clock",
        title: "Kidney · Kapha",
        subtitle: "5:00 PM - 7:00 PM · Water",
        summary: "Restoration and stillness",
        payload: {},
        fetchedAt: "2026-04-22T12:15:00Z",
        refreshAfter: "2026-04-22T13:30:00Z",
      },
      biorhythm: {
        kind: "biorhythm",
        engineId: "biorhythm",
        title: "Energy 72%",
        subtitle: "Physical Rising 81%",
        summary: "Physical 81% · Emotional 68% · Intellectual 67%",
        payload: {},
        fetchedAt: "2026-04-22T12:15:00Z",
        refreshAfter: "2026-04-22T14:15:00Z",
      },
      vimshottari: {
        kind: "vimshottari",
        engineId: "vimshottari",
        title: "Sun > Moon > Mars",
        subtitle: "Next antar in 3d",
        summary: "Maha Sun · Antar Moon · Praty Mars",
        payload: {},
        fetchedAt: "2026-04-22T12:15:00Z",
        refreshAfter: "2026-04-22T14:15:00Z",
      },
    },
  };

  const markdown = withFixedNow("2026-04-22T12:20:00Z", () =>
    buildPulseBoardMarkdown(snapshot, "biorhythm"),
  );

  assert.match(markdown, /# Pulse Board/);
  assert.match(markdown, /- Title mode: Biorhythm/);
  assert.match(markdown, /- Menu bar title: Energy 72%/);
  assert.match(markdown, /## TCM Organ/);
  assert.match(markdown, /- Organ: Kidney · Kapha/);
  assert.match(markdown, /- Next refresh: 1h 10m/);
  assert.match(markdown, /- Cached: 5m ago \(/);
  assert.match(markdown, /## Biorhythm/);
  assert.match(markdown, /- Dominant: Physical Rising 81%/);
  assert.match(markdown, /## Vimshottari/);
  assert.match(markdown, /- Dasha: Maha Sun · Antar Moon · Praty Mars/);
  assert.match(markdown, /## Board Status/);
  assert.match(markdown, /- Cache state: FRESH/);
  assert.match(markdown, /- Combined board: /);
});

test("buildPulseBoardMarkdown explains when personal pulse sections need profile data", () => {
  const dashboard = createDashboardSnapshot();
  const snapshot: MenuBarSnapshot = {
    dashboard: {
      ...dashboard,
      profile: {
        ...dashboard.profile!,
        birthDate: undefined,
      },
    },
    syncIssues: [],
    insights: {},
  };

  const markdown = buildPulseBoardMarkdown(snapshot, "vimshottari");

  assert.match(
    markdown,
    /- Summary: Add birth data in Profile to unlock vimshottari pulse\./,
  );
  assert.match(markdown, /## Biorhythm/);
  assert.match(
    markdown,
    /- Add birth data in Profile to unlock biorhythm pulse\./,
  );
  assert.match(markdown, /## Vimshottari/);
  assert.match(
    markdown,
    /- Add birth data in Profile to unlock vimshottari pulse\./,
  );
});

test("buildPulseBoardMarkdown lists dashboard and pulse sync issues when present", () => {
  const snapshot: MenuBarSnapshot = {
    dashboard: {
      ...createDashboardSnapshot(),
      syncIssues: [
        {
          resource: "profile",
          target: "selemene",
          message: "Profile refresh timed out.",
        },
      ],
      syncError: "Profile refresh timed out.",
    },
    syncIssues: [
      {
        resource: "biorhythm",
        target: "witness",
        message: "Witness gateway unavailable.",
      },
    ],
    syncError: "Witness gateway unavailable.",
    insights: {},
  };

  const markdown = buildPulseBoardMarkdown(snapshot, "biorhythm");

  assert.match(markdown, /## Dashboard Issues/);
  assert.match(markdown, /- profile \(selemene\): Profile refresh timed out\./);
  assert.match(markdown, /## Pulse Issues/);
  assert.match(
    markdown,
    /- biorhythm \(witness\): Witness gateway unavailable\./,
  );
});
