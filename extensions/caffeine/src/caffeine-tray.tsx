import { Color, Icon, MenuBarExtra, openExtensionPreferences, showToast, Toast } from '@raycast/api';
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_INACTIVE_STATE, getCurrentState, startCaffeine, stopCaffeine } from './utils/caffeine';
import { formatDuration, formatRemainingTime } from './utils/time';
import { CaffeineState, TIMER_PRESETS, TimerPreset } from './utils/types';

export default function Command() {
  const [state, setState] = useState<CaffeineState>(DEFAULT_INACTIVE_STATE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshState = useCallback(async () => {
    try {
      const current = await getCurrentState();
      setState(current);
    } catch {
      setState(DEFAULT_INACTIVE_STATE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
    const interval = setInterval(() => {
      refreshState();
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshState]);

  const handleTurnOn = async () => {
    try {
      setIsLoading(true);
      const newState = await startCaffeine(0);
      setState(newState);
      await showToast({
        style: Toast.Style.Success,
        title: 'Caffeine Activated',
        message: 'Keeping Windows awake indefinitely',
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to Activate Caffeine',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTimer = async (seconds: number) => {
    const wasActive = state.active;
    try {
      setIsLoading(true);
      const newState = await startCaffeine(seconds);
      setState(newState);
      await showToast({
        style: Toast.Style.Success,
        title: wasActive ? 'Caffeine Timer Updated' : 'Caffeine Activated',
        message: `Keeping Windows awake for ${formatDuration(seconds)}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: wasActive ? 'Failed to Update Timer' : 'Failed to Activate Caffeine',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTurnOff = async () => {
    try {
      setIsLoading(true);
      const newState = await stopCaffeine();
      setState(newState);
      await showToast({
        style: Toast.Style.Success,
        title: 'Caffeine Stopped',
        message: 'Windows normal power management restored',
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to Stop Caffeine',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // When inactive, do not display in system tray
  if (!state.active) {
    return null;
  }

  const isTimerActive = typeof state.expiresAt === 'number' && state.expiresAt > 0;
  const remainingText = isTimerActive ? formatRemainingTime(state.expiresAt) : 'Indefinite';

  return (
    <MenuBarExtra
      icon={{ source: Icon.Sun, tintColor: Color.Orange }}
      title={isTimerActive ? remainingText : undefined}
      tooltip={`Caffeine Active (${isTimerActive ? remainingText : 'Indefinitely'})`}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        title={isTimerActive ? `Active • ${remainingText}` : 'Active (Indefinitely)'}
        icon={{ source: Icon.Sun, tintColor: Color.Orange }}
      />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Turn Off"
          icon={{ source: Icon.Stop, tintColor: Color.Red }}
          onAction={handleTurnOff}
        />
        {!isTimerActive ? null : (
          <MenuBarExtra.Item
            title="Turn On (Indefinitely)"
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            onAction={handleTurnOn}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Change Duration">
        {TIMER_PRESETS.map((preset: TimerPreset) => (
          <MenuBarExtra.Item
            key={preset.id}
            title={preset.title}
            onAction={() => handleStartTimer(preset.durationSeconds)}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
