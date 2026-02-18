import { Action, ActionPanel, Alert, Detail, Icon, List, confirmAlert, environment } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getAppVersionFromPackage } from "./app-version.ts";
import {
  buildDiagnosticsChatSummary,
  buildDiagnosticsIssueTemplate,
  buildDiagnosticsPayloadV2,
  type DiagnosticsEvent,
} from "./diagnostics-report.ts";
import { getDynamicPomodoroCopy } from "./dynamic-pomodoro-copy.ts";
import {
  getStoredDynamicPomodoroLanguage,
  setStoredDynamicPomodoroLanguage,
  type DynamicPomodoroLanguage,
} from "./dynamic-pomodoro-language.ts";
import { stopCompletionSound } from "./sound-player";
import { formatLinearProgress } from "./linear-progress";
import { formatDuration, MAX_MINUTES, type TimerRollingProgress } from "./timer-core";
import { useTimerController } from "./use-timer-controller";

function toRelativeTime(timestamp: number | undefined, now: number): string {
  if (!Number.isFinite(timestamp)) {
    return "never";
  }
  const deltaMs = Math.max(0, now - Number(timestamp));
  if (deltaMs < 5_000) {
    return "just now";
  }
  const seconds = Math.floor(deltaMs / 1_000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

type PresetsListViewProps = {
  canChangeStyle: boolean;
  chooseStyleSectionTitle: string;
  chooseStyleFlowTitle: string;
  chooseStyleClassicTitle: string;
  chooseStyleSubtitleClassic: string;
  chooseStyleSubtitleFlow: string;
  onChangePomodoroStyle: (style: "flow" | "classic") => void;
  pomodoroStyle: "flow" | "classic";
};

function PresetsListView({
  canChangeStyle,
  chooseStyleSectionTitle,
  chooseStyleFlowTitle,
  chooseStyleClassicTitle,
  chooseStyleSubtitleClassic,
  chooseStyleSubtitleFlow,
  onChangePomodoroStyle,
  pomodoroStyle,
}: PresetsListViewProps) {
  return (
    <List searchBarPlaceholder="Выбрать стиль и минуты">
      <List.Section title={chooseStyleSectionTitle}>
        <List.Item
          title={chooseStyleFlowTitle}
          subtitle={chooseStyleSubtitleFlow}
          icon={pomodoroStyle === "flow" ? Icon.CheckCircle : Icon.Bolt}
          actions={
            <ActionPanel>
              <Action
                title="Включить Flow"
                icon={Icon.Bolt}
                onAction={canChangeStyle ? () => onChangePomodoroStyle("flow") : undefined}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={chooseStyleClassicTitle}
          subtitle={chooseStyleSubtitleClassic}
          icon={pomodoroStyle === "classic" ? Icon.CheckCircle : Icon.Clock}
          actions={
            <ActionPanel>
              <Action
                title="Включить Classic"
                icon={Icon.Clock}
                onAction={canChangeStyle ? () => onChangePomodoroStyle("classic") : undefined}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

type ProgressMetricsViewProps = {
  copy: ReturnType<typeof getDynamicPomodoroCopy>;
  metrics: TimerRollingProgress;
};

function formatRatePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatTrendPercent(value: number | undefined, notAvailable: string): string {
  if (value === undefined) {
    return notAvailable;
  }
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function ProgressMetricsView({ copy, metrics }: ProgressMetricsViewProps) {
  return (
    <List searchBarPlaceholder={copy.progressScreenTitle}>
      <List.Section title={copy.progressSummarySectionTitle}>
        <List.Item title={copy.progressFocus7dTitle} subtitle={formatDuration(metrics.focusTimeMs7d)} icon={Icon.Stopwatch} />
        <List.Item title={copy.progressCompletionRate7dTitle} subtitle={formatRatePercent(metrics.completionRate7d)} icon={Icon.BarChart} />
        <List.Item title={copy.progressAverageCycle7dTitle} subtitle={formatDuration(metrics.avgCompletedDurationMs7d)} icon={Icon.Clock} />
        <List.Item title={copy.progressActiveDays7dTitle} subtitle={`${metrics.activeCompletionDays7d}/7`} icon={Icon.Calendar} />
      </List.Section>
      <List.Section title={copy.progressTrendSectionTitle}>
        <List.Item
          title={copy.progressFocusTrendTitle}
          subtitle={formatTrendPercent(metrics.focusTrendVsPrev7dPercent, copy.progressNotAvailable)}
          icon={Icon.BarChart}
        />
        <List.Item
          title={copy.progressCompletionTrendTitle}
          subtitle={formatTrendPercent(metrics.completionTrendVsPrev7dPercent, copy.progressNotAvailable)}
          icon={Icon.BarChart}
        />
      </List.Section>
      <List.Section title={copy.progressStabilitySectionTitle}>
        <List.Item title={copy.progressInterruptRateTitle} subtitle={formatRatePercent(metrics.interruptRate7d)} icon={Icon.Pause} />
        <List.Item
          title={copy.progressAdjustmentsPerSessionTitle}
          subtitle={metrics.avgAdjustmentsPerSession7d.toFixed(2)}
          icon={Icon.Gear}
        />
      </List.Section>
    </List>
  );
}

export default function Command() {
  const {
    canDecrease,
    canIncrease,
    handleContinueAfterCompletion,
    handleMinus1,
    handleMinus5,
    handlePause,
    handlePlus1,
    handlePlus5,
    handleQuickStartPreset,
    handleReset,
    handleClearStats,
    handleResetToSelectedPreset,
    handleSetPomodoroStyle,
    handleStart,
    handleStopAfterCompletion,
    handleToggle,
    isFinished,
    isReady,
    primaryControlIcon,
    primaryControlTitle,
    state,
    statusIcon,
    statusText,
    timerText,
    remainingMs,
    watchdogDiagnostics,
    diagnosticsTimeline,
    diagnosticsReadable,
    diagnosticsTimelineReadable,
    availableActions,
    needsCompletionDecision,
    rollingStats24h,
    progressMetrics,
    styleChoiceSeen,
  } = useTimerController();
  const [dynamicPomodoroLanguage, setDynamicPomodoroLanguage] = useState<DynamicPomodoroLanguage>("en");

  useEffect(() => {
    void stopCompletionSound();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadDynamicPomodoroLanguage = async () => {
      const language = await getStoredDynamicPomodoroLanguage();
      if (!cancelled && language) {
        setDynamicPomodoroLanguage(language);
      }
    };
    void loadDynamicPomodoroLanguage();
    return () => {
      cancelled = true;
    };
  }, []);

  const dynamicPomodoroCopy = useMemo(() => getDynamicPomodoroCopy(dynamicPomodoroLanguage), [dynamicPomodoroLanguage]);

  const now = Date.now();
  const timeline: DiagnosticsEvent[] = diagnosticsTimeline.map((event) => ({
    eventType: event.eventType,
    relativeTime: toRelativeTime(event.timestamp, now),
    status: event.status,
    detail: event.detail,
  }));
  const diagnosticsPayload = buildDiagnosticsPayloadV2(
    {
      now,
      appVersion: getAppVersionFromPackage(),
      commandName: "dynamic-pomodoro",
      launchType: environment.launchType ? String(environment.launchType) : undefined,
      timerSnapshot: {
        isRunning: state.isRunning,
        minutes: state.minutes,
        remainingMs,
        isFinished,
        needsCompletionDecision,
        selectedPreset: availableActions.selectedPreset,
      },
      watchdogDiagnostics,
      timeline,
      integrity: {
        storageReadable: diagnosticsReadable || diagnosticsTimelineReadable,
        diagnosticsReadable: diagnosticsReadable && diagnosticsTimelineReadable,
        notificationAvailable: true,
        soundConfigured: true,
        cooldownActiveAtLastAttempt:
          typeof watchdogDiagnostics.lastSoundAttemptAt === "number" && now - watchdogDiagnostics.lastSoundAttemptAt < 10_000,
      },
      reproductionTemplate: {
        steps: "Что делал: ...",
        expected: "Что ожидал: ...",
        actual: "Что произошло: ...",
        frequency: "Как часто воспроизводится: ...",
      },
    },
    { privacyMode: "safe", includeTimeline: true },
  );
  const diagnosticsChatSummary = buildDiagnosticsChatSummary(diagnosticsPayload);
  const diagnosticsIssueTemplate = buildDiagnosticsIssueTemplate(diagnosticsPayload);
  const diagnosticsJsonSafe = JSON.stringify(diagnosticsPayload, null, 2);
  const selectedPresetMinutes = availableActions.selectedPreset ?? state.minutes;
  const isRussian = dynamicPomodoroLanguage === "ru";
  const currentStyleName = availableActions.pomodoroStyle === "flow" ? "Flow" : "Classic";
  const breakReadyPrimaryTitle = availableActions.completionPrimaryAction === "extend-5"
    ? dynamicPomodoroCopy.breakReadyExtend5
    : isRussian
      ? `Продолжить ${selectedPresetMinutes} мин`
      : `Continue ${selectedPresetMinutes} Min`;
  const completionRatePercent = Math.round(rollingStats24h.completionRate24h * 100);
  const totalMs = Math.max(1, state.minutes * 60_000);
  const elapsedMs = Math.max(0, totalMs - Math.max(0, remainingMs));
  const timerProgressText = formatLinearProgress(elapsedMs / totalMs, 16);
  const statsLastStartText = toRelativeTime(rollingStats24h.lastStartAt, now);
  const statsLastCompletionText = toRelativeTime(rollingStats24h.lastCompletionAt, now);
  const statsSummaryText = isRussian
    ? `Фокус: ${formatDuration(rollingStats24h.focusTimeMs24h)} • Доля завершений: ${completionRatePercent}%`
    : `Focus: ${formatDuration(rollingStats24h.focusTimeMs24h)} • Rate: ${completionRatePercent}%`;
  const statsViewerMarkdown = [
    "## Pomodoro Statistics (24h)",
    `- Pomodoros: **${rollingStats24h.starts24h}**`,
    `- Completed: **${rollingStats24h.completions24h}**`,
    `- Focus Time: **${formatDuration(rollingStats24h.focusTimeMs24h)}**`,
    `- Completion Rate: **${completionRatePercent}%**`,
    "",
    `Last start: ${statsLastStartText}`,
    `Last completion: ${statsLastCompletionText}`,
  ].join("\n");
  const handleDynamicPomodoroLanguageChange = (language: DynamicPomodoroLanguage) => {
    setDynamicPomodoroLanguage(language);
    void setStoredDynamicPomodoroLanguage(language);
  };

  return (
    <List isLoading={!isReady} searchBarPlaceholder="Search timer controls">
      {!isReady ? (
        <List.Section title="Timer">
          <List.Item title="Loading timer state..." icon={Icon.Clock} />
        </List.Section>
      ) : (
        <>
      <List.Section title="Timer">
        <List.Item
          title={timerText}
          subtitle={`Status: ${statusText} • ${timerProgressText}`}
          icon={statusIcon}
          accessories={[{ text: `${state.minutes} / ${MAX_MINUTES} min` }]}
          actions={
            <ActionPanel>
              {state.isRunning ? (
                <Action title="Pause" icon={Icon.Pause} onAction={handlePause} shortcut={{ modifiers: ["cmd"], key: "p" }} />
              ) : (
                <Action title="Start" icon={Icon.PlayFilled} onAction={handleStart} shortcut={{ modifiers: ["cmd"], key: "s" }} />
              )}
              <Action
                title="Toggle Start or Pause"
                icon={Icon.ArrowsContract}
                onAction={handleToggle}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title={`Quick Start ${availableActions.selectedPreset ?? state.minutes} Min`}
                icon={Icon.Play}
                onAction={availableActions.canQuickStart ? () => handleQuickStartPreset(availableActions.selectedPreset ?? state.minutes) : undefined}
                shortcut={{ modifiers: ["cmd"], key: "1" }}
              />
              <Action title="Quick Start 25 Min" icon={Icon.Play} onAction={() => handleQuickStartPreset(25)} shortcut={{ modifiers: ["cmd"], key: "2" }} />
              <Action
                title={`Reset to Preset ${availableActions.selectedPreset ?? state.minutes}`}
                icon={Icon.RotateClockwise}
                onAction={availableActions.canResetToPreset ? handleResetToSelectedPreset : undefined}
                shortcut={{ modifiers: ["cmd"], key: "0" }}
              />
              <Action
                title="Add 1 Min"
                icon={Icon.PlusCircle}
                onAction={canIncrease ? handlePlus1 : undefined}
                shortcut={{ modifiers: [], key: "arrowRight" }}
              />
              <Action
                title="Subtract 1 Min"
                icon={Icon.MinusCircle}
                onAction={canDecrease ? handleMinus1 : undefined}
                shortcut={{ modifiers: [], key: "arrowLeft" }}
              />
              <Action
                title="Add 5 Min"
                icon={Icon.PlusCircle}
                onAction={canIncrease ? handlePlus5 : undefined}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              />
              <Action
                title="Subtract 5 Min"
                icon={Icon.MinusCircle}
                onAction={canDecrease ? handleMinus5 : undefined}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Controls">
        {needsCompletionDecision && isFinished && !state.isRunning ? (
          <List.Item
            title={dynamicPomodoroCopy.breakReadyTitle}
            subtitle={
              availableActions.completionPrimaryAction === "extend-5"
                ? dynamicPomodoroCopy.breakReadyFlowMessage
                : dynamicPomodoroCopy.breakReadyClassicMessage
            }
            icon={Icon.CheckCircle}
            actions={
              <ActionPanel>
                <Action title={breakReadyPrimaryTitle} icon={Icon.Play} onAction={handleContinueAfterCompletion} />
                <Action title={dynamicPomodoroCopy.breakReadyStopAndReset} icon={Icon.Stop} onAction={handleStopAfterCompletion} />
              </ActionPanel>
            }
          />
        ) : null}
        {!styleChoiceSeen ? (
          <List.Item
            title={dynamicPomodoroCopy.pomodoroStyleTitle}
            subtitle={dynamicPomodoroCopy.chooseStyleSubtitle}
            icon={Icon.Bolt}
            actions={
              <ActionPanel>
                <Action title="Flow" icon={Icon.Bolt} onAction={() => handleSetPomodoroStyle("flow")} />
                <Action title="Classic" icon={Icon.Clock} onAction={() => handleSetPomodoroStyle("classic")} />
              </ActionPanel>
            }
          />
        ) : null}
        <List.Item
          title={primaryControlTitle}
          subtitle={state.isRunning ? "Timer is running" : isFinished ? "Timer finished" : "Ready to start"}
          icon={primaryControlIcon}
          actions={
            <ActionPanel>
              {state.isRunning ? (
                <Action title="Pause" icon={Icon.Pause} onAction={handlePause} shortcut={{ modifiers: ["cmd"], key: "p" }} />
              ) : (
                <Action title="Start" icon={Icon.PlayFilled} onAction={handleStart} shortcut={{ modifiers: ["cmd"], key: "s" }} />
              )}
              <Action
                title={`Quick Start ${availableActions.selectedPreset ?? state.minutes} Min`}
                icon={Icon.Play}
                onAction={availableActions.canQuickStart ? () => handleQuickStartPreset(availableActions.selectedPreset ?? state.minutes) : undefined}
                shortcut={{ modifiers: ["cmd"], key: "1" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Stop"
          subtitle={state.isRunning ? "Stop current session and reset timer" : "Start timer to enable stop"}
          icon={Icon.Stop}
          actions={
            <ActionPanel>
              <Action
                title="Stop"
                icon={Icon.Stop}
                onAction={state.isRunning ? handleReset : undefined}
                shortcut={state.isRunning ? { modifiers: ["cmd"], key: "r" } : undefined}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={dynamicPomodoroCopy.pomodoroStyleTitle}
          subtitle={`${isRussian ? "Текущий режим" : "Current mode"}: ${currentStyleName} • ${selectedPresetMinutes} ${isRussian ? "мин" : "min"}`}
          icon={availableActions.pomodoroStyle === "flow" ? Icon.Bolt : Icon.Clock}
          actions={
            <ActionPanel>
              <Action.Push
                title={dynamicPomodoroCopy.openStyleAndMinutes}
                icon={Icon.ChevronRight}
                target={
                  <PresetsListView
                    canChangeStyle={availableActions.canChangeStyle}
                    chooseStyleSectionTitle={dynamicPomodoroCopy.pomodoroStyleTitle}
                    chooseStyleFlowTitle="Flow"
                    chooseStyleClassicTitle="Classic"
                    chooseStyleSubtitleClassic={dynamicPomodoroCopy.pomodoroStyleClassicSubtitle}
                    chooseStyleSubtitleFlow={dynamicPomodoroCopy.pomodoroStyleFlowSubtitle}
                    onChangePomodoroStyle={handleSetPomodoroStyle}
                    pomodoroStyle={availableActions.pomodoroStyle}
                  />
                }
              />
            </ActionPanel>
          }
        />
        {!state.isRunning ? (
          <List.Item
            title="Reset"
            subtitle="Set remaining time to selected minutes"
            icon={Icon.RotateAntiClockwise}
            actions={
              <ActionPanel>
                <Action title="Reset" icon={Icon.RotateAntiClockwise} onAction={handleReset} shortcut={{ modifiers: ["cmd"], key: "r" }} />
                <Action
                  title={`Reset to Preset ${availableActions.selectedPreset ?? state.minutes}`}
                  icon={Icon.RotateClockwise}
                  onAction={availableActions.canResetToPreset ? handleResetToSelectedPreset : undefined}
                  shortcut={{ modifiers: ["cmd"], key: "0" }}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
      <List.Section title={dynamicPomodoroCopy.infoSectionTitle}>
        <List.Item
          title={dynamicPomodoroCopy.title}
          subtitle={dynamicPomodoroCopy.subtitle}
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <Action.Push
                title={dynamicPomodoroCopy.openGuide}
                icon={Icon.Text}
                target={<Detail markdown={dynamicPomodoroCopy.viewerMarkdown} />}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title={dynamicPomodoroCopy.quickStart15}
                icon={Icon.Play}
                onAction={availableActions.canQuickStart ? () => handleQuickStartPreset(15) : undefined}
              />
              <Action
                title={dynamicPomodoroCopy.quickStart25}
                icon={Icon.Play}
                onAction={availableActions.canQuickStart ? () => handleQuickStartPreset(25) : undefined}
              />
              <Action
                title={dynamicPomodoroCopy.quickStart40}
                icon={Icon.Play}
                onAction={availableActions.canQuickStart ? () => handleQuickStartPreset(40) : undefined}
              />
              <Action
                title={dynamicPomodoroCopy.useEnglish}
                icon={dynamicPomodoroLanguage === "en" ? Icon.CheckCircle : Icon.Globe}
                onAction={() => handleDynamicPomodoroLanguageChange("en")}
              />
              <Action
                title={dynamicPomodoroCopy.useRussian}
                icon={dynamicPomodoroLanguage === "ru" ? Icon.CheckCircle : Icon.Globe}
                onAction={() => handleDynamicPomodoroLanguageChange("ru")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={dynamicPomodoroCopy.statsRowTitle}
          subtitle={statsSummaryText}
          icon={Icon.BarChart}
          actions={
            <ActionPanel>
              <Action.Push title="Open Statistics" icon={Icon.BarChart} target={<Detail markdown={statsViewerMarkdown} />} />
              <Action.Push
                title={dynamicPomodoroCopy.openProgress}
                icon={Icon.BarChart}
                target={<ProgressMetricsView copy={dynamicPomodoroCopy} metrics={progressMetrics} />}
              />
              <Action
                title="Обнулить статистику"
                icon={Icon.Trash}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Обнулить статистику?",
                    message: "Будут удалены старты и завершения за историю в приложении.",
                    primaryAction: {
                      title: "Обнулить",
                      style: Alert.ActionStyle.Destructive,
                    },
                    dismissAction: {
                      title: "Отмена",
                      style: Alert.ActionStyle.Cancel,
                    },
                  });
                  if (!confirmed) {
                    return;
                  }
                  handleClearStats();
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Diagnostics Center"
          subtitle="Open the Action Panel to copy support diagnostics"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Chat Summary"
                content={diagnosticsChatSummary}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard title="Copy GitHub Issue Template" content={diagnosticsIssueTemplate} />
              <Action.CopyToClipboard title="Copy Diagnostics JSON (Safe)" content={diagnosticsJsonSafe} />
            </ActionPanel>
          }
        />
      </List.Section>
        </>
      )}
    </List>
  );
}
