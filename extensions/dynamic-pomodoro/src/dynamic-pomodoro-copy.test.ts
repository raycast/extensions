import assert from "node:assert/strict";
import test from "node:test";

import { getDynamicPomodoroCopy } from "./dynamic-pomodoro-copy.ts";

test("getDynamicPomodoroCopy returns English copy", () => {
  const copy = getDynamicPomodoroCopy("en");

  assert.equal(copy.infoSectionTitle, "Details");
  assert.equal(copy.statsRowTitle, "Stats (24h)");
  assert.equal(copy.openProgress, "Open Progress");
  assert.equal(copy.progressScreenTitle, "Progress Metrics");
  assert.equal(copy.title, "Dynamic Pomodoro Playbook");
  assert.equal(copy.subtitle, "Adaptive cycles: 15 -> 25 -> 40 min.");
  assert.equal(copy.quickStart15, "Quick Start 15");
  assert.equal(copy.quickStart25, "Quick Start 25");
  assert.equal(copy.quickStart40, "Quick Start 40");
  assert.equal(copy.openGuide, "Open Playbook");
  assert.equal(copy.useEnglish, "Use English");
  assert.equal(copy.useRussian, "Use Russian");
  assert.equal(copy.pomodoroStyleTitle, "Focus Mode");
  assert.equal(copy.breakReadyTitle, "Break is ready");
  assert.equal(copy.breakReadyFlowMessage, "In flow? Extend 5 min.");
  assert.equal(copy.breakReadyClassicMessage, "Continue with selected preset.");
  assert.match(copy.viewerMarkdown, /This is not just a Pomodoro/);
  assert.match(copy.viewerMarkdown, /## Key Facts/);
  assert.match(copy.viewerMarkdown, /## How to Use \(3 Steps\)/);
});

test("getDynamicPomodoroCopy returns Russian copy", () => {
  const copy = getDynamicPomodoroCopy("ru");

  assert.equal(copy.infoSectionTitle, "Информация");
  assert.equal(copy.statsRowTitle, "Статистика за 24ч");
  assert.equal(copy.openProgress, "Открыть прогресс");
  assert.equal(copy.progressScreenTitle, "Метрики прогресса");
  assert.equal(copy.title, "Гид по Dynamic Pomodoro");
  assert.equal(copy.subtitle, "Гибкие циклы: 15 -> 25 -> 40 мин.");
  assert.equal(copy.quickStart15, "Быстрый старт 15");
  assert.equal(copy.quickStart25, "Быстрый старт 25");
  assert.equal(copy.quickStart40, "Быстрый старт 40");
  assert.equal(copy.openGuide, "Открыть гид");
  assert.equal(copy.useEnglish, "Переключить на English");
  assert.equal(copy.useRussian, "Использовать русский");
  assert.equal(copy.pomodoroStyleTitle, "Режим фокуса");
  assert.equal(copy.breakReadyTitle, "Перерыв готов");
  assert.equal(copy.breakReadyFlowMessage, "В потоке? Продлить на 5 минут.");
  assert.equal(copy.breakReadyClassicMessage, "Продолжить с выбранным пресетом.");
  assert.match(copy.viewerMarkdown, /Это не просто помидор/);
  assert.match(copy.viewerMarkdown, /## Важные факты/);
  assert.match(copy.viewerMarkdown, /## Как пользоваться \(3 шага\)/);
});

test("getDynamicPomodoroCopy falls back to English when language is unknown", () => {
  const copy = getDynamicPomodoroCopy("de");

  assert.equal(copy.title, "Dynamic Pomodoro Playbook");
  assert.equal(copy.quickStart25, "Quick Start 25");
  assert.equal(copy.openGuide, "Open Playbook");
});
