import test from "node:test";
import assert from "node:assert/strict";

import type { PomodoroConfig } from "./preferences";
import {
  confirmSessionEnd,
  finishSessionAndContinue,
  getActualActiveMinutes,
  getSessionSnapshot,
  handleSleepDetected,
  normalizeRestoredSession,
  pauseSession,
  resumeSession,
  shouldScheduleTimerElapsed,
  startWorkSession,
  type PomodoroSession,
} from "./pomodoro-machine";

const config: PomodoroConfig = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  workVolume: 60,
  breakVolume: 50,
  alarmVolume: 80,
};

function buildWorkSession(currentTime = Date.UTC(2026, 0, 1, 0, 0, 0)): PomodoroSession {
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
  assert.equal(resumed.activeStartedAt, new Date(startAt + 10 * 60_000).toISOString());
  assert.equal(resumed.plannedEndAt, new Date(startAt + 30 * 60_000).toISOString());
});

test("作業終了で短休憩へ進む", () => {
  const session = buildWorkSession();
  const next = finishSessionAndContinue(session, config, Date.UTC(2026, 0, 1, 0, 25, 0));

  assert.equal(next.kind, "shortBreak");
  assert.equal(next.completedWorkSessions, 1);
  assert.equal(next.status, "running");
});

test("4セット目の作業終了で長休憩へ進む", () => {
  const fourthWork: PomodoroSession = {
    ...buildWorkSession(),
    completedWorkSessions: 3,
  };

  const next = finishSessionAndContinue(fourthWork, config, Date.UTC(2026, 0, 1, 2, 0, 0));

  assert.equal(next.kind, "longBreak");
  assert.equal(next.completedWorkSessions, 4);
});

test("スリープ検知で running セッションが paused になる", () => {
  const session = buildWorkSession();
  const paused = handleSleepDetected(session, Date.UTC(2026, 0, 1, 0, 10, 0));

  assert.equal(paused.status, "paused");
});

test("復元時に終了時刻を過ぎていても running のまま維持する", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const restored = normalizeRestoredSession(session, startAt + 40 * 60_000);

  assert.equal(restored.status, "running");
  assert.equal(getActualActiveMinutes(restored, startAt + 50 * 60_000), 50);
});

test("snapshot は running セッションが時間切れなら表示上 awaiting_confirmation にする", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const snapshot = getSessionSnapshot(session, startAt + 40 * 60_000);

  assert.equal(snapshot.displayStatus, "awaiting_confirmation");
  assert.equal(snapshot.overtimeMs, 15 * 60_000);
});

test("実作業時間は一時停止中の時間を含めない", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const paused = pauseSession(session, startAt + 10 * 60_000);
  const resumed = resumeSession(paused, startAt + 20 * 60_000);

  assert.equal(getActualActiveMinutes(resumed, startAt + 30 * 60_000), 20);
});

test("予定時刻を過ぎても作業継続中は実作業時間が増える", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);

  assert.equal(getActualActiveMinutes(session, startAt + 25 * 60_000), 25);
  assert.equal(getActualActiveMinutes(session, startAt + 50 * 60_000), 50);
});

test("表示用 awaiting_confirmation でも activeStartedAt があれば実作業時間を返す", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const snapshot = getSessionSnapshot(session, startAt + 50 * 60_000);

  assert.equal(snapshot.displayStatus, "awaiting_confirmation");
  assert.equal(getActualActiveMinutes(snapshot.session, startAt + 50 * 60_000), 50);
});

test("awaiting_confirmation では確認待ち中に作業時間が増えない", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const elapsed = confirmSessionEnd(session, startAt + 25 * 60_000);

  assert.equal(elapsed.status, "awaiting_confirmation");
  assert.equal(elapsed.accumulatedActiveMs, 25 * 60_000);
  assert.equal(getActualActiveMinutes(elapsed, startAt + 55 * 60_000), 25);
});

test("予定終了後の running セッションには timer-elapsed を再スケジュールしない", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);

  assert.equal(shouldScheduleTimerElapsed(session, startAt + 20 * 60_000), true);
  assert.equal(shouldScheduleTimerElapsed(session, startAt + 30 * 60_000), false);
});

test("期限切れ running は normalize 後も pause できる", () => {
  const startAt = Date.UTC(2026, 0, 1, 0, 0, 0);
  const session = buildWorkSession(startAt);
  const normalized = normalizeRestoredSession(session, startAt + 40 * 60_000);
  const paused = pauseSession(normalized, startAt + 41 * 60_000);

  assert.equal(normalized.status, "running");
  assert.equal(paused.status, "paused");
  assert.equal(paused.accumulatedActiveMs, 41 * 60_000);
});
