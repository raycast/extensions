import type { DynamicPomodoroLanguage } from "./dynamic-pomodoro-language.ts";

export type DynamicPomodoroCopy = {
  infoSectionTitle: string;
  statsRowTitle: string;
  openProgress: string;
  progressScreenTitle: string;
  progressSummarySectionTitle: string;
  progressTrendSectionTitle: string;
  progressStabilitySectionTitle: string;
  progressFocus7dTitle: string;
  progressCompletionRate7dTitle: string;
  progressAverageCycle7dTitle: string;
  progressActiveDays7dTitle: string;
  progressFocusTrendTitle: string;
  progressCompletionTrendTitle: string;
  progressInterruptRateTitle: string;
  progressAdjustmentsPerSessionTitle: string;
  progressNotAvailable: string;
  title: string;
  subtitle: string;
  quickStart15: string;
  quickStart25: string;
  quickStart40: string;
  openGuide: string;
  useEnglish: string;
  useRussian: string;
  pomodoroStyleTitle: string;
  pomodoroStyleFlowSubtitle: string;
  pomodoroStyleClassicSubtitle: string;
  chooseStyleSubtitle: string;
  openStyleAndMinutes: string;
  breakReadyTitle: string;
  breakReadyFlowMessage: string;
  breakReadyClassicMessage: string;
  breakReadyExtend5: string;
  breakReadyStopAndReset: string;
  viewerMarkdown: string;
};

const ENGLISH_COPY: DynamicPomodoroCopy = {
  infoSectionTitle: "Details",
  statsRowTitle: "Stats (24h)",
  openProgress: "Open Progress",
  progressScreenTitle: "Progress Metrics",
  progressSummarySectionTitle: "Summary (7d)",
  progressTrendSectionTitle: "Trend vs Previous 7d",
  progressStabilitySectionTitle: "Stability",
  progressFocus7dTitle: "Focus Time (7d)",
  progressCompletionRate7dTitle: "Completion Rate (7d)",
  progressAverageCycle7dTitle: "Average Completed Cycle (7d)",
  progressActiveDays7dTitle: "Active Days (7d)",
  progressFocusTrendTitle: "Focus Trend",
  progressCompletionTrendTitle: "Completion Trend",
  progressInterruptRateTitle: "Interrupt Rate (7d)",
  progressAdjustmentsPerSessionTitle: "Adjustments per Session (7d)",
  progressNotAvailable: "n/a",
  title: "Dynamic Pomodoro Playbook",
  subtitle: "Adaptive cycles: 15 -> 25 -> 40 min.",
  quickStart15: "Quick Start 15",
  quickStart25: "Quick Start 25",
  quickStart40: "Quick Start 40",
  openGuide: "Open Playbook",
  useEnglish: "Use English",
  useRussian: "Use Russian",
  pomodoroStyleTitle: "Focus Mode",
  pomodoroStyleFlowSubtitle: "Cycle end: Extend by 5 min",
  pomodoroStyleClassicSubtitle: "Cycle end: Continue preset",
  chooseStyleSubtitle: "Choose your default focus mode",
  openStyleAndMinutes: "Open mode and duration",
  breakReadyTitle: "Break is ready",
  breakReadyFlowMessage: "In flow? Extend 5 min.",
  breakReadyClassicMessage: "Continue with selected preset.",
  breakReadyExtend5: "Extend 5 Min",
  breakReadyStopAndReset: "Stop and Reset",
  viewerMarkdown: `# This is not just a Pomodoro 🍅

  This is a dynamic focus mode that adapts to you.
  You do not have to force 25 minutes from the start.
  The core rule is simple: honest focus over perfect plans.

  ## Key Facts

  - Stats are always calculated for the rolling last 24 hours: starts, completions, focus time, and completion rate.
  - In Flow mode you can extend focus by 5 minutes at cycle end; in Classic mode it continues with the selected preset.

  ## How to Use (3 Steps)

  1. Start short (for example, 6 minutes) to enter rhythm without resistance.
  2. If focus drops, reduce to 4-5 minutes. That is adaptation, not failure.
  3. If focus is stable, grow gradually to 8, 10, 15+ minutes.

  Rule: adjust minutes to real concentration, not an ideal schedule.`,
};

const RUSSIAN_COPY: DynamicPomodoroCopy = {
  infoSectionTitle: "Информация",
  statsRowTitle: "Статистика за 24ч",
  openProgress: "Открыть прогресс",
  progressScreenTitle: "Метрики прогресса",
  progressSummarySectionTitle: "Сводка (7д)",
  progressTrendSectionTitle: "Тренд к прошлым 7д",
  progressStabilitySectionTitle: "Стабильность",
  progressFocus7dTitle: "Время фокуса (7д)",
  progressCompletionRate7dTitle: "Доля завершений (7д)",
  progressAverageCycle7dTitle: "Средний завершенный цикл (7д)",
  progressActiveDays7dTitle: "Активные дни (7д)",
  progressFocusTrendTitle: "Тренд фокуса",
  progressCompletionTrendTitle: "Тренд доли завершений",
  progressInterruptRateTitle: "Доля прерываний (7д)",
  progressAdjustmentsPerSessionTitle: "Изменений минут на сессию (7д)",
  progressNotAvailable: "н/д",
  title: "Гид по Dynamic Pomodoro",
  subtitle: "Гибкие циклы: 15 -> 25 -> 40 мин.",
  quickStart15: "Быстрый старт 15",
  quickStart25: "Быстрый старт 25",
  quickStart40: "Быстрый старт 40",
  openGuide: "Открыть гид",
  useEnglish: "Переключить на English",
  useRussian: "Использовать русский",
  pomodoroStyleTitle: "Режим фокуса",
  pomodoroStyleFlowSubtitle: "В конце цикла: Продлить на 5 минут",
  pomodoroStyleClassicSubtitle: "В конце цикла: Продолжить пресет",
  chooseStyleSubtitle: "Выбери режим по умолчанию",
  openStyleAndMinutes: "Открыть режим и минуты",
  breakReadyTitle: "Перерыв готов",
  breakReadyFlowMessage: "В потоке? Продлить на 5 минут.",
  breakReadyClassicMessage: "Продолжить с выбранным пресетом.",
  breakReadyExtend5: "Продлить на 5 минут",
  breakReadyStopAndReset: "Остановить и сбросить",
  viewerMarkdown: `# Это не просто помидор 🍅

  Это динамический фокус-режим, который подстраивается под тебя.
  Тебе не нужно выжимать из себя 25 минут с первого цикла.
  Главный принцип один: честный фокус важнее идеального плана.

  ## Важные факты

  - Статистика всегда считается за последние 24 часа: старты, завершения, время фокуса и доля завершений.
  - В режиме Flow в конце цикла можно продлить фокус на 5 минут, а в Classic продолжается выбранный пресет.

  ## Как пользоваться (3 шага)

  1. Начни с короткого отрезка (например, 6 минут), чтобы спокойно войти в ритм.
  2. Если фокус просел, снизь до 4-5 минут. Это адаптация, а не откат.
  3. Если фокус стабилен, повышай длительность постепенно: 8, 10, 15+ минут.

  Ориентир: меняй минуты по фактической концентрации, а не по идеальному расписанию.`,
};

export function getDynamicPomodoroCopy(
  language: string | undefined,
): DynamicPomodoroCopy {
  const normalizedLanguage: DynamicPomodoroLanguage =
    language === "ru" ? "ru" : "en";
  return normalizedLanguage === "ru" ? RUSSIAN_COPY : ENGLISH_COPY;
}
