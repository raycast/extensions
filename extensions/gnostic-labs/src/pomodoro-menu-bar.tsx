import { Color, Icon, Image, launchCommand, LaunchType, MenuBarExtra } from '@raycast/api';
import { useState } from 'react';
import { FocusText, LongBreakText, ShortBreakText, TaskText } from '../lib/constants';
import {
  continueInterval,
  createInterval,
  duration,
  getCurrentInterval,
  isPaused,
  pauseInterval,
  preferences,
  progress,
  resetInterval,
} from '../lib/intervals';
import { secondsToTime } from '../lib/secondsToTime';
import { Interval, IntervalType } from '../lib/types';

const IconTint: Color.Dynamic = {
  light: '#000000',
  dark: '#FFFFFF',
  adjustContrast: false,
};

/**
 * Menu bar item for controlling the pomodoro timer
 */
export default function TogglePomodoroTimer() {
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(getCurrentInterval());

  if (currentInterval && progress(currentInterval) >= 100) {
    launchCommand({
      name: 'pomodoro-control-timer',
      type: LaunchType.UserInitiated,
      context: { currentInterval },
    })
      .catch((error) => {
        console.error(error);
      })
      .then(() => console.log('pomodoro-control-timer launched'));
  }

  function onStart(type: Exclude<IntervalType, 'task'>) {
    setCurrentInterval(createInterval(type, true));
  }

  function onPause() {
    setCurrentInterval(pauseInterval());
  }

  function onContinue() {
    setCurrentInterval(continueInterval());
  }

  function onReset() {
    resetInterval();
    setCurrentInterval(undefined);
  }

  let icon: Image.ImageLike;
  icon = { source: 'tomato-0.png', tintColor: IconTint };
  let title = '--:--';
  if (currentInterval) {
    const progressInTenth = 100 - Math.floor(progress(currentInterval) / 10) * 10;
    icon = { source: `tomato-${progressInTenth}.png`, tintColor: IconTint };
    title = secondsToTime(currentInterval.intervalLength - duration(currentInterval.parts));
  }

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={'Pomodoro'}>
      {currentInterval ? (
        <>
          {isPaused(currentInterval) ? (
            <MenuBarExtra.Item
              title="Continue"
              icon={Icon.Play}
              onAction={onContinue}
              shortcut={{ modifiers: ['cmd'], key: 'c' }}
            />
          ) : (
            <MenuBarExtra.Item
              title="Pause"
              icon={Icon.Pause}
              onAction={onPause}
              shortcut={{ modifiers: ['cmd'], key: 'p' }}
            />
          )}
          <MenuBarExtra.Item
            title="Reset"
            icon={Icon.Stop}
            onAction={onReset}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
        </>
      ) : (
        <>
          <MenuBarExtra.Item
            title={FocusText}
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={`🎯`}
            onAction={() => onStart('focus')}
            shortcut={{ modifiers: ['cmd'], key: 'f' }}
          />
          <MenuBarExtra.Item
            title={ShortBreakText}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            onAction={() => onStart('short-break')}
            shortcut={{ modifiers: ['cmd'], key: 's' }}
          />
          <MenuBarExtra.Item
            title={LongBreakText}
            subtitle={`${preferences.longBreakIntervalDuration}:00`}
            icon={`🚶`}
            onAction={() => onStart('long-break')}
            shortcut={{ modifiers: ['cmd'], key: 'l' }}
          />
          <MenuBarExtra.Item
            title={TaskText}
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={`🧑‍💻`}
            onAction={() => {
              launchCommand({ name: 'task-form', type: LaunchType.UserInitiated });
            }}
            shortcut={{ modifiers: ['cmd'], key: 't' }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
