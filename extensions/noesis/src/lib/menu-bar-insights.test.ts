import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMenuBarInsight,
  buildMenuBarInsightPlans,
  buildMenuBarTitle,
  buildPulseSubtitle,
} from "./menu-bar-insights";
import { DashboardSnapshot, EngineExecutionResult } from "./types";

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
    timestamps: {
      lastSyncAt: "2026-04-22T12:00:00Z",
    },
  };
}

test("buildMenuBarInsightPlans schedules current pulse plus personal insights", () => {
  const dashboard = createDashboardSnapshot();
  const plans = buildMenuBarInsightPlans(
    dashboard,
    {},
    new Date("2026-04-22T12:15:00Z"),
  );

  assert.equal(plans.length, 3);
  assert.deepEqual(
    plans.map((plan) => plan.engineId),
    ["vedic-clock", "biorhythm", "vimshottari"],
  );
  assert.equal(plans[1]?.input.birthData?.date, "1991-08-13");
  assert.equal(plans[2]?.input.birthData?.timezone, "Asia/Kolkata");
});

test("buildMenuBarInsight derives a vedic clock title and next boundary refresh", () => {
  const result: EngineExecutionResult = {
    engineId: "vedic-clock",
    result: {
      current_organ: {
        organ: "Kidney",
        element: "Water",
        time_window: "5:00 PM - 7:00 PM",
        peak_energy: "Restoration and stillness",
        recommended_activities: ["Deep work", "Meditation"],
      },
      current_dosha: {
        dosha: "Kapha",
      },
      recommendation: {
        time_window: "5:00 PM - 7:00 PM",
      },
      timezone: {
        offset_minutes: 330,
      },
      calculated_for: "2026-04-22T12:15:00Z",
    },
    metadata: {},
    raw: {
      engine_id: "vedic-clock",
      result: {
        current_organ: {
          organ: "Kidney",
        },
      },
    },
  };

  const insight = buildMenuBarInsight(
    "vedicClock",
    result,
    "2026-04-22T12:15:00Z",
  );

  assert.equal(insight.title, "Kidney · Kapha");
  assert.equal(insight.subtitle, "5:00 PM - 7:00 PM · Water");
  assert.equal(insight.summary, "Restoration and stillness");
  assert.equal(insight.refreshAfter, "2026-04-22T13:30:00.000Z");
});

test("buildMenuBarTitle respects the preferred pulse mode when available", () => {
  const dashboard = createDashboardSnapshot();
  const title = buildMenuBarTitle(
    dashboard,
    {
      vedicClock: {
        kind: "vedicClock",
        engineId: "vedic-clock",
        title: "Kidney · Kapha",
        summary: "Restoration and stillness",
        payload: {},
        fetchedAt: "2026-04-22T12:15:00Z",
        refreshAfter: "2026-04-22T13:30:00.000Z",
      },
      biorhythm: {
        kind: "biorhythm",
        engineId: "biorhythm",
        title: "Energy 72%",
        summary: "Physical 81% · Emotional 68% · Intellectual 67%",
        payload: {},
        fetchedAt: "2026-04-22T12:15:00Z",
        refreshAfter: "2026-04-22T14:15:00.000Z",
      },
    },
    "biorhythm",
    undefined,
  );

  assert.equal(title, "Energy 72%");
});

test("buildMenuBarTitle falls back to Pulse instead of health text when no insight is cached", () => {
  const dashboard = createDashboardSnapshot();
  const title = buildMenuBarTitle(dashboard, {}, "vedicClock", undefined);

  assert.equal(title, "Pulse");
});

test("buildMenuBarTitle truncates long insight titles for menu bar display", () => {
  const dashboard = createDashboardSnapshot();
  const title = buildMenuBarTitle(
    dashboard,
    {
      vedicClock: {
        kind: "vedicClock",
        engineId: "vedic-clock",
        title: "Pancreas Meridian Alignment and Integration Window",
        summary: "Restoration and stillness",
        payload: {},
        fetchedAt: "2026-04-22T12:15:00Z",
        refreshAfter: "2026-04-22T13:30:00.000Z",
      },
    },
    "vedicClock",
    undefined,
  );

  assert.ok(title.length <= 28);
  assert.ok(title.startsWith("Pancreas"));
});

test("buildPulseSubtitle keeps the combined board summary glanceable", () => {
  const subtitle = buildPulseSubtitle({
    vedicClock: {
      kind: "vedicClock",
      engineId: "vedic-clock",
      title: "Kidney",
      summary: "Restoration and stillness through deep internal repair",
      payload: {},
      fetchedAt: "2026-04-22T12:15:00Z",
      refreshAfter: "2026-04-22T13:30:00.000Z",
    },
    biorhythm: {
      kind: "biorhythm",
      engineId: "biorhythm",
      title: "Energy 72%",
      summary: "Physical 81% · Emotional 68% · Intellectual 67%",
      payload: {},
      fetchedAt: "2026-04-22T12:15:00Z",
      refreshAfter: "2026-04-22T14:15:00.000Z",
    },
    vimshottari: {
      kind: "vimshottari",
      engineId: "vimshottari",
      title: "Sun > Moon > Mars",
      summary:
        "Maha Sun · Antar Moon · Praty Mars with a long explanatory suffix",
      payload: {},
      fetchedAt: "2026-04-22T12:15:00Z",
      refreshAfter: "2026-04-22T14:15:00.000Z",
    },
  });

  assert.ok(subtitle.length <= 72);
});
