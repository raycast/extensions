import { Color, Icon, Image, launchCommand, LaunchType, MenuBarExtra } from '@raycast/api';
import { getAccessToken, OAuthService, withAccessToken } from '@raycast/utils';
import { useState } from 'react';
import { FocusText, LongBreakText, ShortBreakText } from '../lib/constants';
import { duration, getCurrentInterval, isPaused, preferences, progress } from '../lib/intervals';
import { secondsToTime } from '../lib/secondsToTime';
import {
  slackContinueInterval,
  slackCreateInterval,
  slackPauseInterval,
  slackResetInterval,
} from '../lib/slack/slackIntervals';
import { Interval, IntervalType } from '../lib/types';

const IconTint: Color.Dynamic = {
  light: '#000000',
  dark: '#FFFFFF',
  adjustContrast: false,
};

const slackClient = OAuthService.slack({
  scope: 'users.profile:write dnd:write',
});

export default withAccessToken(slackClient)(TogglePomodoroTimer);

export function TogglePomodoroTimer() {
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(getCurrentInterval());
  const { token } = getAccessToken();

  if (currentInterval && progress(currentInterval) >= 100) {
    try {
      launchCommand({
        name: 'slack-pomodoro-control-timer',
        type: LaunchType.UserInitiated,
        context: { currentInterval },
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function onStart(type: IntervalType) {
    const interval = await slackCreateInterval(type, token);
    setCurrentInterval(interval);
  }

  async function onPause() {
    const interval = await slackPauseInterval(token);
    setCurrentInterval(interval);
  }

  async function onContinue() {
    const interval = await slackContinueInterval(token);
    setCurrentInterval(interval);
  }

  async function onReset() {
    await slackResetInterval(token);
    setCurrentInterval(undefined);
  }

  let icon: Image.ImageLike;
  icon = { source: 'tomato-0.png', tintColor: IconTint };
  if (currentInterval) {
    const progressInTenth = 100 - Math.floor(progress(currentInterval) / 10) * 10;
    icon = { source: `tomato-${progressInTenth}.png`, tintColor: IconTint };
  }

  const title = preferences.enableTimeOnMenuBar
    ? currentInterval
      ? secondsToTime(currentInterval.intervalLength - duration(currentInterval.parts))
      : '--:--'
    : undefined;

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={'Pomodoro'}>
      {currentInterval ? (
        <>
          {isPaused(currentInterval) ? (
            <MenuBarExtra.Item
              title="Continue"
              icon={Icon.Play}
              onAction={async () => onContinue()}
              shortcut={{ modifiers: ['cmd'], key: 'c' }}
            />
          ) : (
            <MenuBarExtra.Item
              title="Pause"
              icon={Icon.Pause}
              onAction={async () => onPause()}
              shortcut={{ modifiers: ['cmd'], key: 'p' }}
            />
          )}
          <MenuBarExtra.Item
            title="Reset"
            icon={Icon.Stop}
            onAction={async () => onReset()}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
        </>
      ) : (
        <>
          <MenuBarExtra.Item
            title={FocusText}
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={`🎯`}
            onAction={async () => await onStart('focus')}
            shortcut={{ modifiers: ['cmd'], key: 'f' }}
          />
          <MenuBarExtra.Item
            title={ShortBreakText}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            onAction={async () => await onStart('short-break')}
            shortcut={{ modifiers: ['cmd'], key: 's' }}
          />
          <MenuBarExtra.Item
            title={LongBreakText}
            subtitle={`${preferences.longBreakIntervalDuration}:00`}
            icon={`🚶`}
            onAction={async () => await onStart('long-break')}
            shortcut={{ modifiers: ['cmd'], key: 'l' }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
