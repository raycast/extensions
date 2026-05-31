import test from "node:test";
import assert from "node:assert/strict";

import type { PomodoroConfig } from "./preferences";
import {
  finishSessionAndContinue,
  getActualActiveMinutes,
  getSessionSnapshot,
  handleSleepDetected,
  normalizeRestoredSession,
  pauseSession,
  resumeSession,
  startWorkSession,
  type PomodoroSession,
} from "./pomodoro-machine";

const config: PomodoroConfig = {
  workMinutes: 37,
  shortBreakMinutes: 3,
  longBreakMinutes: 15,
  longBreakEvery: 3,
  workVolume: 60,
  breakVolume: 50,
  alarmVolume: 80,
};

function buildWorkSession(
  currentTime = Date.UTC(2026, 0, 1, 0, 0, 0),
): PomodoroSession {
  return startWorkSession(config, currentTime);
}

test("開始時は作業セッションが running になる", () => {
  const session = buildWorkSession();

  assert.equal(session.kind, "work");
  assert.equal(session.status, "running");
  assert.equal(session.completedWorkSessions, 0);
});

test("一時停止後に再開すると plannedEndAt が後ろへずれる", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const paused = pauseSession(session, startAt + 5 * 60_000);
  const resumed = resumeSession(paused, startAt + 10 * 60_000);

  assert.equal(paused.status, "paused");
  assert.equal(paused.accumulatedActiveMs, 5 * 60_000);
  assert.equal(resumed.status, "running");
  assert.equal(
    resumed.activeStartedAt,
    new Date(startAt + 10 * 60_000).toISOString(),
  );
  assert.equal(
    resumed.plannedEndAt,
    new Date(startAt + 42 * 60_000).toISOString(),
  );
});

test("作業終了で短休憩へ進む", () => {
  const session = buildWorkSession();
  const next = finishSessionAndContinue(
    session,
    config,
    Date.UTC(2026, 0, 1, 0, 37, 0),
  );

  assert.equal(next.kind, "shortBreak");
  assert.equal(next.completedWorkSessions, 1);
  assert.equal(next.status, "running");
});

test("3セット目の作業終了で長休憩へ進む", () => {
  const thirdWork: PomodoroSession = {
    ...buildWorkSession(),
    completedWorkSessions: 2,
  };

  const next = finishSessionAndContinue(
    thirdWork,
    config,
    Date.UTC(2026, 0, 1, 2, 0, 0),
  );

  assert.equal(next.kind, "longBreak");
  assert.equal(next.completedWorkSessions, 3);
});

test("スリープ検知で running セッションが paused になる", () => {
  const session = buildWorkSession();
  const paused = handleSleepDetected(session, Date.UTC(2026, 0, 1, 0, 10, 0));

  assert.equal(paused.status, "paused");
});

test("復元時に終了時刻を過ぎていれば awaiting_confirmation になる", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const restored = normalizeRestoredSession(session, startAt + 40 * 60_000);

  assert.equal(restored.status, "awaiting_confirmation");
});

test("snapshot は running セッションが時間切れなら表示上 awaiting_confirmation にする", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const snapshot = getSessionSnapshot(session, startAt + 40 * 60_000);

  assert.equal(snapshot.displayStatus, "awaiting_confirmation");
  assert.equal(snapshot.overtimeMs, 3 * 60_000);
});

test("実作業時間は一時停止中の時間を含めない", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const paused = pauseSession(session, startAt + 10 * 60_000);
  const resumed = resumeSession(paused, startAt + 20 * 60_000);

  assert.equal(getActualActiveMinutes(resumed, startAt + 30 * 60_000), 20);
});
