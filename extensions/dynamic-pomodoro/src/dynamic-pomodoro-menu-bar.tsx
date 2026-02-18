import { Icon, MenuBarExtra } from "@raycast/api";
import { useEffect } from "react";
import { stopCompletionSound } from "./sound-player";
import { MAX_MINUTES } from "./timer-core";
import { useTimerController } from "./use-timer-controller";

export default function Command() {
  const presetShortcutKeys: Array<"1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"> = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const {
    canDecrease,
    canIncrease,
    handleApplyPreset,
    handleMinus1,
    handlePause,
    handlePlus1,
    handleQuickStartPreset,
    handleReset,
    handleResetToSelectedPreset,
    handleStart,
    handleToggle,
    isReady,
    primaryControlIcon,
    primaryControlTitle,
    state,
    statusIcon,
    statusText,
    timerText,
    availableActions,
  } = useTimerController();

  useEffect(() => {
    void stopCompletionSound();
  }, []);

  return (
    <MenuBarExtra
      isLoading={!isReady}
      icon={statusIcon}
      title={isReady ? timerText : "..."}
      tooltip="Dynamic Pomodoro"
    >
      {!isReady ? (
        <MenuBarExtra.Item title="Loading timer state..." />
      ) : (
        <>
      {state.isRunning ? (
        <MenuBarExtra.Item icon={Icon.Pause} title="Pause" onAction={handlePause} shortcut={{ modifiers: ["cmd"], key: "p" }} />
      ) : (
        <MenuBarExtra.Item icon={Icon.PlayFilled} title="Start" onAction={handleStart} shortcut={{ modifiers: ["cmd"], key: "s" }} />
      )}
      <MenuBarExtra.Item icon={Icon.RotateAntiClockwise} title="Reset" onAction={handleReset} shortcut={{ modifiers: ["cmd"], key: "r" }} />
      <MenuBarExtra.Item icon={Icon.ArrowsContract} title="Toggle Start/Pause" onAction={handleToggle} shortcut={{ modifiers: ["cmd"], key: "t" }} />
      <MenuBarExtra.Item
        icon={Icon.Play}
        title={`Quick Start ${availableActions.selectedPreset ?? state.minutes} min`}
        onAction={availableActions.canQuickStart ? () => handleQuickStartPreset(availableActions.selectedPreset ?? state.minutes) : undefined}
        shortcut={{ modifiers: ["cmd"], key: "1" }}
      />
      <MenuBarExtra.Item icon={Icon.Play} title="Quick Start 25 min" onAction={() => handleQuickStartPreset(25)} shortcut={{ modifiers: ["cmd"], key: "2" }} />
      <MenuBarExtra.Item
        icon={Icon.RotateClockwise}
        title={`Reset to Preset ${availableActions.selectedPreset ?? state.minutes}`}
        onAction={availableActions.canResetToPreset ? handleResetToSelectedPreset : undefined}
        shortcut={{ modifiers: ["cmd"], key: "0" }}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        icon={Icon.PlusCircle}
        title="Add 1 min"
        onAction={canIncrease ? handlePlus1 : undefined}
        tooltip={canIncrease ? "Increase session length" : "Unavailable while running or at maximum minutes"}
      />
      <MenuBarExtra.Item
        icon={Icon.MinusCircle}
        title="Subtract 1 min"
        onAction={canDecrease ? handleMinus1 : undefined}
        tooltip={canDecrease ? "Decrease session length" : "Unavailable while running or at minimum minutes"}
      />
      {availableActions.presets.map((preset, index) => {
        const presetShortcutKey = presetShortcutKeys[index];
        return (
          <MenuBarExtra.Item
            key={`preset-${preset}`}
            icon={state.minutes === preset ? Icon.CheckCircle : Icon.Clock}
            title={`Preset ${preset} min`}
            onAction={availableActions.canApplyPreset ? () => handleApplyPreset(preset) : undefined}
            shortcut={presetShortcutKey ? { modifiers: ["opt"], key: presetShortcutKey } : undefined}
          />
        );
      })}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item icon={primaryControlIcon} title={`Control: ${primaryControlTitle}`} />
      <MenuBarExtra.Item title={`Minutes: ${state.minutes} / ${MAX_MINUTES}`} />
      <MenuBarExtra.Item icon={statusIcon} title={`Status: ${statusText}`} />
        </>
      )}
    </MenuBarExtra>
  );
}
