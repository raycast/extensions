// Regression tests for behaviour observed against the live Keito API on 2026-10-15.
import { describe, expect, it, vi } from "vitest";
import { resolveEntryMode, todayIn } from "./dates";
import { errorFromResponse } from "./errors";
import { normalizeIdentity, normalizeProject, normalizeTimeEntry } from "./normalize";
import { resolveSession, SESSION_KEY } from "./session";
import { fullAccessMe, memoryStore, rawEntry, TEST_ACCOUNT, TEST_TOKEN } from "./testUtils";
import { planEntry } from "./workflows";

const liveMe = {
  ...fullAccessMe,
  company: {
    id: TEST_ACCOUNT,
    name: "Acme Consulting",
    timezone: "America/New_York",
    manual_entry_format: "duration",
    require_notes: true,
    allow_past_timer_starts: false,
    time_rounding_description: "rounded up to the next 15 minutes",
  },
  capabilities: { can_track_time: true, can_view_team_time: true },
};

describe("workspace settings from /users/me", () => {
  it("reads company settings and does not mistake full-access capabilities for a read-only key", () => {
    expect(normalizeIdentity(liveMe, TEST_ACCOUNT)).toMatchObject({
      credentialType: "full_access",
      settings: {
        timezone: "America/New_York",
        manualEntryFormat: "duration",
        requireNotes: true,
        allowPastTimerStarts: false,
        timeRoundingDescription: "rounded up to the next 15 minutes",
      },
    });
  });

  it("explains when the identity cannot track time", () => {
    expect(() => normalizeIdentity({ ...liveMe, capabilities: { can_track_time: false } }, TEST_ACCOUNT)).toThrow(
      expect.objectContaining({ kind: "tracking_not_allowed", isSetupProblem: true }),
    );
  });

  it("drops projects the identity cannot track time on", () => {
    expect(normalizeProject({ id: "p", name: "P", can_track_time: false })).toBeUndefined();
    expect(normalizeProject({ id: "p", name: "P", can_track_time: true })).toMatchObject({ id: "p" });
  });

  it("re-verifies sessions stored before settings existed", async () => {
    const store = memoryStore();
    const fetchIdentity = vi.fn(async () => normalizeIdentity(liveMe, TEST_ACCOUNT));
    await resolveSession({ token: TEST_TOKEN, accountId: TEST_ACCOUNT }, fetchIdentity, store);
    const stored = JSON.parse(store.data.get(SESSION_KEY)!);
    delete stored.identity.settings;
    store.data.set(SESSION_KEY, JSON.stringify(stored));
    const session = await resolveSession({ token: TEST_TOKEN, accountId: TEST_ACCOUNT }, fetchIdentity, store);
    expect(fetchIdentity).toHaveBeenCalledTimes(2);
    expect(session.identity.settings.timezone).toBe("America/New_York");
  });
});

describe("dates in the workspace timezone", () => {
  it("uses the workspace calendar date, not the Mac's", () => {
    // 23:30 Central on Oct 15 is already Oct 16 in New York.
    const now = new Date("2026-10-16T04:30:00Z");
    expect(todayIn("America/New_York", now)).toBe("2026-10-16");
    expect(todayIn("America/Chicago", now)).toBe("2026-10-15");
    expect(todayIn("Not/AZone", now)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("follows Keito's manual entry format unless overridden", () => {
    expect(resolveEntryMode("company", { manualEntryFormat: "duration" })).toBe("duration");
    expect(resolveEntryMode(undefined, { manualEntryFormat: "start_end_time" })).toBe("start_end");
    expect(resolveEntryMode("start_end", { manualEntryFormat: "duration" })).toBe("start_end");
    expect(resolveEntryMode("company", undefined)).toBe("duration");
  });
});

describe("live response details", () => {
  it("normalizes HH:mm:ss times to the documented HH:mm", () => {
    const entry = normalizeTimeEntry(rawEntry({ started_time: "09:05:00", ended_time: "17:30:59" }));
    expect([entry.startedTime, entry.endedTime]).toEqual(["09:05", "17:30"]);
    // Unchanged times are therefore not sent as edits.
    const plan = planEntry(
      {
        projectId: entry.projectId,
        taskId: entry.taskId,
        spentDate: entry.spentDate,
        notes: "new",
        startTime: "9:05",
        endTime: "17:30",
      },
      { mode: "start_end", existing: entry },
    );
    expect(plan).toEqual({ kind: "update", id: entry.id, body: { notes: "new" } });
  });

  it("mentions the Company ID when Keito rejects the key or company", () => {
    const error = errorFromResponse(401, { error: "unauthorized", error_description: "Invalid API key or company" });
    expect(error).toMatchObject({ kind: "invalid_credentials" });
    expect(error.message).toMatch(/API key or Company ID/);
    expect(errorFromResponse(401, { error_description: "Invalid API key" }).message).not.toMatch(/Company ID/);
  });
});

describe("workspace rules in the entry form", () => {
  const base = { projectId: "p", taskId: "t", spentDate: "2026-10-15" };

  it("requires notes when the workspace does", () => {
    expect(planEntry({ ...base, notes: " " }, { mode: "duration", requireNotes: true })).toMatchObject({
      kind: "error",
      field: "notes",
    });
    expect(planEntry({ ...base, notes: "x" }, { mode: "duration", requireNotes: true })).toMatchObject({
      kind: "timer",
    });
  });

  it("blocks past timer starts when the workspace disallows them, but allows completed entries", () => {
    expect(planEntry({ ...base, startTime: "9" }, { mode: "start_end", allowPastTimerStarts: false })).toMatchObject({
      kind: "error",
      field: "startTime",
    });
    expect(
      planEntry({ ...base, startTime: "9", endTime: "10" }, { mode: "start_end", allowPastTimerStarts: false }),
    ).toMatchObject({
      kind: "create",
    });
    expect(planEntry({ ...base, startTime: "9" }, { mode: "start_end", allowPastTimerStarts: true })).toMatchObject({
      kind: "timer",
    });
  });
});

describe("live error shapes", () => {
  it("treats Keito's 403 for locked time as a lock, and other 403s as permission errors", () => {
    expect(
      errorFromResponse(403, {
        error: "forbidden",
        error_description: "This time entry is locked and cannot be edited",
      }),
    ).toMatchObject({
      kind: "locked",
      message: "This time entry is locked and cannot be edited",
    });
    expect(
      errorFromResponse(403, {
        error: "forbidden",
        error_description: "This time entry is locked and cannot be restarted",
      }).kind,
    ).toBe("locked");
    expect(errorFromResponse(403, { error: "project_not_assigned" }).kind).toBe("forbidden");
  });
});
