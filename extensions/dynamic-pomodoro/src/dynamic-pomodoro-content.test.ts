import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("Dynamic Pomodoro includes Dynamic Pomodoro section", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /<List\.Section title=\{dynamicPomodoroCopy\.infoSectionTitle\}>/);
});

test("Dynamic Pomodoro information row uses an info icon", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(
    source,
    /<List\.Section title=\{dynamicPomodoroCopy\.infoSectionTitle\}>[\s\S]*?<List\.Item[\s\S]*?title=\{dynamicPomodoroCopy\.title\}[\s\S]*?icon=\{Icon\.Info\}/,
  );
});

test("Dynamic Pomodoro includes Dynamic Pomodoro quick-start actions", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /handleQuickStartPreset\(15\)/);
  assert.match(source, /handleQuickStartPreset\(25\)/);
  assert.match(source, /handleQuickStartPreset\(40\)/);
});

test("Dynamic Pomodoro includes Dynamic Pomodoro language switch actions", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /handleDynamicPomodoroLanguageChange\("en"\)/);
  assert.match(source, /handleDynamicPomodoroLanguageChange\("ru"\)/);
});

test("Dynamic Pomodoro opens Dynamic Pomodoro text in Raycast viewer", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /Action\.Push/);
  assert.match(source, /<Detail markdown=\{dynamicPomodoroCopy\.viewerMarkdown\}/);
});

test("Dynamic Pomodoro does not render completion sound item in command list", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.doesNotMatch(source, /Completion sound:/);
  assert.doesNotMatch(source, /Select the Apple system sound played when the timer ends/);
});

test("Dynamic Pomodoro opens presets in a nested screen", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /function PresetsListView/);
  assert.match(source, /<Action\.Push[\s\S]*title=\{dynamicPomodoroCopy\.openStyleAndMinutes\}/);
  assert.match(source, /target=\{[\s\S]*<PresetsListView/);
});

test("Dynamic Pomodoro shows break-ready flow actions at cycle end", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /title=\{dynamicPomodoroCopy\.breakReadyTitle\}/);
  assert.match(source, /handleContinueAfterCompletion/);
  assert.match(source, /handleStopAfterCompletion/);
});

test("Dynamic Pomodoro renders pomodoro style section", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /title=\{dynamicPomodoroCopy\.pomodoroStyleTitle\}/);
  assert.match(source, /title="Flow"/);
  assert.match(source, /title="Classic"/);
  assert.doesNotMatch(source, /<List\.Section title="Presets">/);
});

test("Dynamic Pomodoro keeps Stop as a separate control item, not inside primary control actions", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /<List\.Item\s+title="Stop"/);
  assert.doesNotMatch(
    source,
    /title=\{primaryControlTitle\}[\s\S]*?<ActionPanel>[\s\S]*?<Action title="Stop" icon=\{Icon\.Stop\}[\s\S]*?Quick Start/,
  );
});

test("Dynamic Pomodoro renders Reset control only when timer is not running", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /\{!state\.isRunning \? \(/);
  assert.match(source, /title="Reset"/);
  assert.match(source, /\) : null\}/);
});

test("Dynamic Pomodoro keeps Timer row focused on start/pause and quick start without stop action", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.doesNotMatch(
    source,
    /title=\{timerText\}[\s\S]*?<ActionPanel>[\s\S]*?<Action title="Stop" icon=\{Icon\.Stop\}[\s\S]*?title="Toggle Start or Pause"/,
  );
});

test("Dynamic Pomodoro maps Cmd+R to running Stop and paused Reset controls", () => {
  const filePath = resolve(import.meta.dirname, "dynamic-pomodoro.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(
    source,
    /title="Stop"[\s\S]*?onAction=\{state\.isRunning \? handleReset : undefined\}[\s\S]*?shortcut=\{state\.isRunning \? \{ modifiers: \["cmd"\], key: "r" \} : undefined\}/,
  );
  assert.match(
    source,
    /title="Reset"[\s\S]*?onAction=\{handleReset\}[\s\S]*?shortcut=\{\{ modifiers: \["cmd"\], key: "r" \}\}/,
  );
});
