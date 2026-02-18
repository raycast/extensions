import {
  clampMinutes,
  DEFAULT_MINUTES,
  DEFAULT_PRESETS,
  getEffectivePomodoroStyle,
  MAX_MINUTES,
  MIN_MINUTES,
  type PomodoroStyle,
  type TimerState,
} from "./timer-state.ts";

type AvailableActionsContext = {
  isReady: boolean;
};

export type AvailableActions = {
  primary: "start" | "pause";
  canIncrease: boolean;
  canDecrease: boolean;
  canApplyPreset: boolean;
  canQuickStart: boolean;
  canReset: boolean;
  canResetToPreset: boolean;
  canChangeStyle: boolean;
  presets: number[];
  selectedPreset: number | null;
  pomodoroStyle: PomodoroStyle;
  completionPrimaryAction: "extend-5" | "continue-preset";
};

export function getNormalizedPresets(state: TimerState): number[] {
  void state;
  const raw = [...DEFAULT_PRESETS];
  const normalized: number[] = [];
  for (const value of raw) {
    const minutes = clampMinutes(value);
    if (!normalized.includes(minutes)) {
      normalized.push(minutes);
    }
  }
  return normalized;
}

export function getAvailableActions(state: TimerState, context: AvailableActionsContext): AvailableActions {
  const presets = getNormalizedPresets(state);
  const fallbackSelectedPreset = presets.includes(state.minutes)
    ? state.minutes
    : presets.includes(DEFAULT_MINUTES)
      ? DEFAULT_MINUTES
      : presets[0] ?? null;
  const requestedSelectedPreset = state.selectedPreset !== undefined ? clampMinutes(state.selectedPreset) : null;
  const selectedPreset = requestedSelectedPreset !== null && presets.includes(requestedSelectedPreset) ? requestedSelectedPreset : fallbackSelectedPreset;
  const primary = state.isRunning ? "pause" : "start";
  const pomodoroStyle = getEffectivePomodoroStyle(state);
  const completionPrimaryAction = pomodoroStyle === "flow" ? "extend-5" : "continue-preset";

  if (!context.isReady) {
    return {
      primary,
      canIncrease: false,
      canDecrease: false,
      canApplyPreset: false,
      canQuickStart: false,
      canReset: false,
      canResetToPreset: false,
      canChangeStyle: false,
      presets,
      selectedPreset,
      pomodoroStyle,
      completionPrimaryAction,
    };
  }

  const canMutateMinutes = !state.isRunning;
  const canIncrease = canMutateMinutes && state.minutes < MAX_MINUTES;
  const canDecrease = canMutateMinutes && state.minutes > MIN_MINUTES;
  const canResetToPreset = canMutateMinutes && selectedPreset !== null && state.minutes !== selectedPreset;

  return {
    primary,
    canIncrease,
    canDecrease,
    canApplyPreset: canMutateMinutes,
    canQuickStart: canMutateMinutes,
    canReset: true,
    canResetToPreset,
    canChangeStyle: canMutateMinutes,
    presets,
    selectedPreset,
    pomodoroStyle,
    completionPrimaryAction,
  };
}
