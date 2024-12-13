import { Cache, getPreferenceValues } from '@raycast/api';
import { FocusText, LongBreakText, ShortBreakText, TaskText } from './constants';
import { updateTask } from './storage';
import { Interval, IntervalExecutor, IntervalType, PomodoroTask, type IntervalPart } from './types';

export const CURRENT_INTERVAL_CACHE_KEY = 'pomodoro-interval/1.1';
const COMPLETED_POMODORO_COUNT_CACHE_KEY = 'pomodoro-interval/completed-pomodoro-count';

export const cache = new Cache();

/**
 * Get the interval that is currently running, including the associated task if there is one
 * @returns `focus`, `short-break`, `long-break`, `task` or `undefined` if no interval is running
 */
export function getCurrentInterval(): Interval | undefined {
  const result = cache.get(CURRENT_INTERVAL_CACHE_KEY);
  if (typeof result === 'string') {
    return JSON.parse(result);
  }
  return undefined;
}

/**
 * Get the current timer's associated task if there is one
 */
export function getCurrentTask(): PomodoroTask | undefined {
  return getCurrentInterval()?.task;
}
/**
 * update the task timers when the current interval changes
 */
cache.subscribe((key, value) => {
  if (key !== CURRENT_INTERVAL_CACHE_KEY) return;
  if (typeof value !== 'string') return;
  const interval: Interval = JSON.parse(value);
  if (interval.task) {
    updateTask(interval.task).then(() => {
      console.log('[CACHE SUBSCRIPTION] updated task', interval.task?.title);
    });
  }
});

/**
 * Get the current timestamp in seconds
 */
export const currentTimestampInSeconds = () => Math.round(new Date().valueOf() / 1000);

/**
 * Get the duration of an interval in seconds
 */
export function duration(parts: IntervalPart[]): number {
  if (!parts?.length) return 0;
  return parts.reduce((acc, part) => {
    return (
      (typeof part.pausedAt !== 'undefined'
        ? part.pausedAt - part.startedAt
        : currentTimestampInSeconds() - part.startedAt) + acc
    );
  }, 0);
}

/**
 * Get the progress of an interval as a percentage
 */
export function progress(interval: Interval): number {
  if (!interval) return 0;
  return (duration(interval.parts) / interval.intervalLength) * 100;
}

export function isPaused({ parts }: Interval): boolean {
  return !!parts.at(-1)?.pausedAt;
}

type IntervalWithoutTask = Omit<Interval, 'task'>;
type IntervalWithTask = IntervalWithoutTask & Required<Pick<Interval, 'task'>>;

/**
 * Create a new interval, optionally with a task
 * @param type - The type of interval to create
 * @param isFreshStart - Whether this is a fresh start or a continuation of an existing interval
 * @param taskInput - The task input if the interval type is `task`
 */
export function createInterval<TIntervalType extends Exclude<IntervalType, 'task'>>(
  type: TIntervalType,
  isFreshStart: boolean
): Interval;
export function createInterval<TIntervalType extends 'task'>(
  type: TIntervalType,
  isFreshStart: boolean,
  taskInput: PomodoroTask
): IntervalWithTask;
export function createInterval<TIntervalType extends IntervalType>(
  type: TIntervalType,
  isFreshStart = true,
  taskInput?: PomodoroTask
): IntervalWithoutTask | IntervalWithTask {
  if (type === 'task' && !taskInput) {
    throw new Error('Task input is required for task intervals');
  }

  const timestamp = currentTimestampInSeconds();

  let intervalLength = intervalDurations[type];
  console.log('[CREATE INTERVAL] interval length', {
    intervalLength,
    type,
    customDuration: taskInput?.customDuration,
  });
  // The custom interval is a number between 1 and 120, so need to convert to minutes
  if (type === 'task' && taskInput?.customDuration) {
    intervalLength = taskInput.customDuration * 60;
    console.log('[CREATE INTERVAL] task custom duration converted to minutes', intervalLength);
  }

  const interval: Interval = {
    type,
    intervalLength,
    parts: [
      {
        startedAt: timestamp,
      },
    ],
    task: taskInput,
  };

  cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
  console.log('[CREATE INTERVAL] interval after cache set', interval.type);
  if (isFreshStart) {
    cache.set(COMPLETED_POMODORO_COUNT_CACHE_KEY, '0');
  } else {
    const lastCount = parseInt(cache.get(COMPLETED_POMODORO_COUNT_CACHE_KEY) ?? '0', 10);
    cache.set(COMPLETED_POMODORO_COUNT_CACHE_KEY, `${lastCount + 1}`);
  }

  return interval;
}

export function pauseInterval() {
  let interval = getCurrentInterval();
  if (interval) {
    interval.parts.at(-1)!.pausedAt = currentTimestampInSeconds();
    cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
  }
  return interval;
}

export function continueInterval() {
  const interval = getCurrentInterval();
  if (!interval) return interval;

  interval.parts.push({
    startedAt: currentTimestampInSeconds(),
  });

  if (interval.task) {
    // Mark the last time spent interval as resumed
    updateTask(interval.task);
  }
  cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
}

/**
 * Reset the current interval and task
 */
export function resetInterval() {
  const interval = getCurrentInterval();
  if (!interval) return;
  if (interval.task) {
    // Mark the last time spent interval as paused
    interval.task.totalTimeSpent += duration(interval.parts);
    updateTask(interval.task);
  }
  cache.remove(CURRENT_INTERVAL_CACHE_KEY);
}

/**
 * Get all completed pomodoros count from cache
 */
export function getCompletedPomodoroCount(): number {
  const result = cache.get(COMPLETED_POMODORO_COUNT_CACHE_KEY);
  if (result) {
    return parseInt(result, 10);
  }

  return 0;
}

/**
 * Returns the next interval execution function based on the current interval
 */
export function getNextIntervalExecutor(): IntervalExecutor {
  const currentInterval = getCurrentInterval();
  // Reset the current interval to clear the cache
  resetInterval();

  const completedCount = getCompletedPomodoroCount();
  const longBreakThreshold = Number.parseInt(preferences.longBreakStartThreshold, 10);
  let executor: IntervalExecutor | undefined;
  switch (currentInterval?.type) {
    case 'short-break':
      executor = {
        title: FocusText,
        onStart: () => {
          if (currentInterval.task) {
            return createInterval('task', false, currentInterval.task);
          }
          return createInterval('focus', false);
        },
      };
      break;
    case 'long-break':
      executor = {
        title: FocusText,
        onStart: () => {
          if (currentInterval.task) {
            return createInterval('task', true, currentInterval.task);
          }
          return createInterval('focus', true);
        },
      };
      break;
    case 'task':
      executor = {
        title: TaskText,
        onStart: () => {
          if (!currentInterval.task) {
            throw new Error('Task is required for task interval');
          }
          return createInterval('task', false, currentInterval.task);
        },
      };
      break;
    case 'focus':
      if (currentInterval.task) {
        executor = {
          title: currentInterval.task.title,
          onStart: () => createInterval('task', false, currentInterval.task!),
        };
      } else {
        executor = { title: FocusText, onStart: () => createInterval('focus', false) };
      }
      break;
    default:
      if (completedCount === longBreakThreshold) {
        executor = {
          title: LongBreakText,
          onStart: () => createInterval('long-break', true),
        };
      } else {
        executor = {
          title: ShortBreakText,
          onStart: () => createInterval('short-break', false),
        };
      }
      break;
  }

  return executor;
}

/**
 * Get the extension preferences
 */
export const preferences = getPreferenceValues<ExtensionPreferences>();

export const intervalDurations: Record<IntervalType, number> = {
  focus: Number.parseInt(preferences.focusIntervalDuration, 10) * 60,
  'short-break': Number.parseInt(preferences.shortBreakIntervalDuration, 10) * 60,
  'long-break': Number.parseInt(preferences.longBreakIntervalDuration, 10) * 60,
  task: Number.parseInt(preferences.focusIntervalDuration, 10) * 60,
};
