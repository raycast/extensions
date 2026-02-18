import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("Diagnostics Center exposes required copy actions", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /title="Diagnostics Center"/);
  assert.match(source, /title="Copy Chat Summary"/);
  assert.match(source, /title="Copy GitHub Issue Template"/);
  assert.match(source, /title="Copy Diagnostics JSON \(Safe\)"/);
});

test("Dynamic Pomodoro timer row action menu exposes start toggle and keeps stop as separate control", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /title=\{timerText\}/);
  assert.match(source, /title="Toggle Start or Pause"/);
  assert.doesNotMatch(
    source,
    /title=\{timerText\}[\s\S]*?<ActionPanel>[\s\S]*?<Action title="Stop" icon=\{Icon\.Stop\}[\s\S]*?title="Toggle Start or Pause"/,
  );
  assert.match(source, /<List\.Item\s+title="Stop"/);
});

test("Dynamic Pomodoro shows statistics in a single compact container", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /title=\{dynamicPomodoroCopy\.statsRowTitle\}/);
  assert.match(source, /subtitle=\{statsSummaryText\}/);
  assert.match(
    source,
    /Фокус: \$\{formatDuration\(rollingStats24h\.focusTimeMs24h\)\} • Доля завершений: \$\{completionRatePercent\}%/,
  );
  assert.doesNotMatch(source, /const statsSummaryText = `Pomodoros:/);
  assert.doesNotMatch(source, /const statsSummaryText = `Completed:/);
  assert.doesNotMatch(source, /accessories=\[\{ text: `Last start:/);
  assert.doesNotMatch(source, /\{ text: `Last completion:/);
  assert.doesNotMatch(source, /title="Starts \(24h\)"/);
  assert.doesNotMatch(source, /title="Completed \(24h\)"/);
  assert.doesNotMatch(source, /title="Focus Time \(24h\)"/);
  assert.doesNotMatch(source, /title="Completion Rate \(24h\)"/);
});

test("Dynamic Pomodoro opens statistics in Raycast viewer", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /title="Open Statistics"/);
  assert.match(source, /<Detail markdown=\{statsViewerMarkdown\} \/>/);
  assert.match(source, /title=\{dynamicPomodoroCopy\.openProgress\}/);
  assert.match(source, /<ProgressMetricsView copy=\{dynamicPomodoroCopy\} metrics=\{progressMetrics\} \/>/);
  assert.match(source, /title="Обнулить статистику"/);
  assert.match(source, /title: "Обнулить статистику\?"/);
  assert.match(source, /handleClearStats\(\)/);
});

test("Dynamic Pomodoro keeps statistics after Dynamic Pomodoro and hides Increase/Decrease by text", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  const infoSectionIndex = source.indexOf("<List.Section title={dynamicPomodoroCopy.infoSectionTitle}>");
  const dynamicItemIndex = source.indexOf("title={dynamicPomodoroCopy.title}");
  const statisticsItemIndex = source.indexOf("title={dynamicPomodoroCopy.statsRowTitle}");
  const diagnosticsItemIndex = source.indexOf('title="Diagnostics Center"');
  assert.ok(infoSectionIndex >= 0);
  assert.ok(dynamicItemIndex > infoSectionIndex);
  assert.ok(statisticsItemIndex > dynamicItemIndex);
  assert.ok(diagnosticsItemIndex > statisticsItemIndex);
  assert.doesNotMatch(source, /Increase by/);
  assert.doesNotMatch(source, /Decrease by/);
});
