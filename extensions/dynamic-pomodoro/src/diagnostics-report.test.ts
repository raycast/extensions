import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiagnosticsChatSummary,
  buildDiagnosticsIssueTemplate,
  buildDiagnosticsPayloadV2,
  sanitizeDiagnosticsText,
  type DiagnosticsEvent,
} from "./diagnostics-report.ts";

function makeTimeline(): DiagnosticsEvent[] {
  return [
    { eventType: "notify", relativeTime: "1m ago", status: "error", detail: "Timeout while sending notification" },
    { eventType: "sound", relativeTime: "55s ago", status: "ok" },
  ];
}

test("buildDiagnosticsPayloadV2 returns safe payload with fallback fields", () => {
  const payload = buildDiagnosticsPayloadV2(
    {
      now: 1_739_474_400_000,
      appVersion: "1.0.0",
      commandName: "dynamic-pomodoro",
      launchType: "user-initiated",
      timerSnapshot: {
        isRunning: false,
        minutes: 25,
        remainingMs: 0,
        isFinished: true,
        needsCompletionDecision: true,
        selectedPreset: 25,
      },
      watchdogDiagnostics: {},
      timeline: makeTimeline(),
      integrity: {
        storageReadable: true,
        diagnosticsReadable: true,
        notificationAvailable: true,
        soundConfigured: false,
        cooldownActiveAtLastAttempt: false,
      },
      reproductionTemplate: {
        steps: "Что делал: ...",
        expected: "Что ожидал: ...",
        actual: "Что произошло: ...",
        frequency: "Как часто: ...",
      },
    },
    { privacyMode: "safe", includeTimeline: true },
  );

  assert.equal(payload.meta.reportVersion, "2");
  assert.equal(payload.meta.generatedAtRelative, "just now");
  assert.equal(payload.watchdog.arm.at, "never");
  assert.equal(payload.watchdog.notify.channel, "n/a");
  assert.equal(payload.integrity.soundConfigured, false);
  assert.equal(payload.timeline.length, 2);
});

test("buildDiagnosticsPayloadV2 applies safe redaction to error fields", () => {
  const payload = buildDiagnosticsPayloadV2(
    {
      now: 1_739_474_400_000,
      appVersion: "1.0.0",
      commandName: "dynamic-pomodoro",
      launchType: "background",
      timerSnapshot: {
        isRunning: true,
        minutes: 50,
        remainingMs: 120_000,
        isFinished: false,
        needsCompletionDecision: false,
        selectedPreset: 50,
      },
      watchdogDiagnostics: {
        lastNotifyError: "ENOENT /Users/mr.foxset/private/file.wav at host api.example.com",
      },
      timeline: [],
      integrity: {
        storageReadable: false,
        diagnosticsReadable: false,
        notificationAvailable: true,
        soundConfigured: true,
        cooldownActiveAtLastAttempt: true,
      },
      reproductionTemplate: {
        steps: "s",
        expected: "e",
        actual: "a",
        frequency: "f",
      },
    },
    { privacyMode: "safe", includeTimeline: false },
  );

  assert.match(payload.watchdog.notify.error, /\[path\]/);
  assert.doesNotMatch(payload.watchdog.notify.error, /\/Users\/mr\.foxset/);
  assert.doesNotMatch(payload.watchdog.notify.error, /api\.example\.com/);
  assert.equal(payload.timeline.length, 0);
});

test("buildDiagnosticsPayloadV2 limits timeline to last N events", () => {
  const timeline = Array.from({ length: 40 }, (_, index) => ({
    eventType: `event-${index}`,
    relativeTime: `${index}s ago`,
    status: "ok" as const,
  }));
  const payload = buildDiagnosticsPayloadV2(
    {
      now: 1_739_474_400_000,
      appVersion: "1.0.0",
      commandName: "dynamic-pomodoro",
      launchType: "background",
      timerSnapshot: {
        isRunning: false,
        minutes: 10,
        remainingMs: 10_000,
        isFinished: false,
        needsCompletionDecision: false,
        selectedPreset: 10,
      },
      watchdogDiagnostics: {},
      timeline,
      integrity: {
        storageReadable: true,
        diagnosticsReadable: true,
        notificationAvailable: true,
        soundConfigured: true,
        cooldownActiveAtLastAttempt: false,
      },
      reproductionTemplate: {
        steps: "s",
        expected: "e",
        actual: "a",
        frequency: "f",
      },
    },
    { privacyMode: "safe", includeTimeline: true },
  );

  assert.equal(payload.timeline.length, 20);
  assert.equal(payload.timeline[0]?.eventType, "event-0");
  assert.equal(payload.timeline[19]?.eventType, "event-19");
});

test("buildDiagnosticsChatSummary returns compact support text", () => {
  const payload = buildDiagnosticsPayloadV2(
    {
      now: 1_739_474_400_000,
      appVersion: "1.0.0",
      commandName: "dynamic-pomodoro",
      launchType: "user-initiated",
      timerSnapshot: {
        isRunning: false,
        minutes: 25,
        remainingMs: 0,
        isFinished: true,
        needsCompletionDecision: true,
        selectedPreset: 25,
      },
      watchdogDiagnostics: {},
      timeline: makeTimeline(),
      integrity: {
        storageReadable: true,
        diagnosticsReadable: true,
        notificationAvailable: true,
        soundConfigured: true,
        cooldownActiveAtLastAttempt: false,
      },
      reproductionTemplate: {
        steps: "Что делал: ...",
        expected: "Что ожидал: ...",
        actual: "Что произошло: ...",
        frequency: "Как часто: ...",
      },
    },
    { privacyMode: "safe", includeTimeline: true },
  );

  const summary = buildDiagnosticsChatSummary(payload);
  assert.match(summary, /\[Dynamic Pomodoro Diagnostics v2\]/);
  assert.match(summary, /Timer: running=false/);
  assert.match(summary, /Timeline:/);
  assert.match(summary, /Reproduction:/);
});

test("buildDiagnosticsIssueTemplate returns markdown sections and json block", () => {
  const payload = buildDiagnosticsPayloadV2(
    {
      now: 1_739_474_400_000,
      appVersion: "1.0.0",
      commandName: "dynamic-pomodoro",
      launchType: "background",
      timerSnapshot: {
        isRunning: false,
        minutes: 25,
        remainingMs: 10_000,
        isFinished: false,
        needsCompletionDecision: false,
        selectedPreset: 25,
      },
      watchdogDiagnostics: {},
      timeline: makeTimeline(),
      integrity: {
        storageReadable: true,
        diagnosticsReadable: true,
        notificationAvailable: true,
        soundConfigured: true,
        cooldownActiveAtLastAttempt: false,
      },
      reproductionTemplate: {
        steps: "Что делал: ...",
        expected: "Что ожидал: ...",
        actual: "Что произошло: ...",
        frequency: "Как часто: ...",
      },
    },
    { privacyMode: "safe", includeTimeline: true },
  );

  const issueTemplate = buildDiagnosticsIssueTemplate(payload);
  assert.match(issueTemplate, /^## Summary/m);
  assert.match(issueTemplate, /^## Reproduction/m);
  assert.match(issueTemplate, /^## Diagnostics JSON/m);
  assert.match(issueTemplate, /```json/);
});

test("sanitizeDiagnosticsText masks paths and hostnames", () => {
  const text = "Open /Users/mr.foxset/private/file.txt and call api.example.com";
  const sanitized = sanitizeDiagnosticsText(text, "safe");

  assert.match(sanitized, /\[path\]/);
  assert.match(sanitized, /\[host\]/);
  assert.doesNotMatch(sanitized, /\/Users\/mr\.foxset/);
});
