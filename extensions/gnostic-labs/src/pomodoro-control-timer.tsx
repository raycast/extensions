import {
  Action,
  ActionPanel,
  closeMainWindow,
  confirmAlert,
  Detail,
  Icon,
  launchCommand,
  LaunchType,
  List,
  popToRoot,
} from '@raycast/api';
import { useCachedPromise, useFetch } from '@raycast/utils';
import { exec } from 'child_process';
import { useEffect, useState } from 'react';
import { FocusText, LongBreakText, ShortBreakText } from '../lib/constants';
import {
  continueInterval,
  createInterval,
  duration,
  getCurrentInterval,
  getNextIntervalExecutor,
  isPaused,
  pauseInterval,
  preferences,
  resetInterval,
} from '../lib/intervals';
import { secondsToTime } from '../lib/secondsToTime';
import { completeTask, getTaskMap } from '../lib/storage';
import { GiphyResponse, Quote, type Interval, type PomodoroTask } from '../lib/types';

/**
 * Create an action that will launch the pomodoro menu bar
 * @param action - The action to perform
 */
const createAction = (action: () => void) => () => {
  action();

  try {
    launchCommand({
      name: 'pomodoro-menu-bar',
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    console.error(error);
  }

  popToRoot();
  closeMainWindow();
};

const RunningIntervalList = (props: { currentInterval: Interval }) => {
  return (
    <>
      {isPaused(props.currentInterval) ? (
        <List.Item
          title="Continue"
          icon={Icon.Play}
          actions={
            <ActionPanel>
              <Action onAction={createAction(continueInterval)} title={'Continue'} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Item
          title="Pause"
          icon={Icon.Pause}
          actions={
            <ActionPanel>
              <Action onAction={createAction(pauseInterval)} title={'Pause'} />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        title="Reset"
        icon={Icon.Stop}
        actions={
          <ActionPanel>
            <Action onAction={createAction(resetInterval)} title={'Reset'} />
          </ActionPanel>
        }
      />
    </>
  );
};

const ActionsList = () => {
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(getCurrentInterval());
  const currentTask = currentInterval?.type === 'task' ? currentInterval.task : undefined;
  const { data: unfinishedTasks, isLoading } = useCachedPromise(
    async () => {
      const tasks = await getTaskMap();
      return Array.from(tasks.values()).filter((t) => !t.completedAt);
    },
    [],
    { onData: (_tasks) => console.log(`${_tasks?.length} unfinished tasks`), execute: true }
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      const interval = getCurrentInterval();
      setCurrentInterval(interval);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <List navigationTitle="Control Pomodoro Timers" isLoading={isLoading}>
      {currentInterval ? (
        currentTask ? (
          <List.Section
            title={currentTask.title}
            subtitle={`In Progress: ${secondsToTime(duration(currentInterval.parts))}`}
          >
            <RunningIntervalList currentInterval={currentInterval} />
          </List.Section>
        ) : (
          <RunningIntervalList currentInterval={currentInterval} />
        )
      ) : (
        <>
          <List.Item
            title={FocusText}
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={`🎯`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval('focus', true))} title={FocusText} />
              </ActionPanel>
            }
          />
          <List.Item
            title={ShortBreakText}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval('short-break', true))} title={ShortBreakText} />
              </ActionPanel>
            }
          />
          <List.Item
            title={LongBreakText}
            subtitle={`${preferences.longBreakIntervalDuration}:00`}
            icon={`🚶`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval('long-break', true))} title={LongBreakText} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Task"
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={'🧑‍💻'}
            actions={
              <ActionPanel>
                <Action
                  title="Create Task Timer"
                  onAction={() => {
                    if (unfinishedTasks?.length) {
                      return launchCommand({
                        name: 'task-list',
                        type: LaunchType.UserInitiated,
                        context: { unfinishedTasks },
                      });
                    }
                    launchCommand({ name: 'task-form', type: LaunchType.UserInitiated }).then(() => null);
                  }}
                />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
};

const handleQuote = (): string => {
  let quote = { content: 'You did it!', author: 'Unknown' };
  const { isLoading, data } = useFetch<Quote[]>('https://api.quotable.io/quotes/random?limit=1', {
    keepPreviousData: true,
  });
  if (!isLoading && data?.length) {
    quote = data[0];
  }

  return `> ${quote.content} \n>\n> &dash; ${quote.author}`;
};

/**
 * This is shown when an interval is completed
 *
 * If tasks are present, this is when we update the various metrics like totalTimeSpent, etc.
 */
const EndOfInterval = ({ currentInterval }: { currentInterval: Interval }) => {
  const [currentTask, setCurrentTask] = useState<PomodoroTask | undefined>(undefined);
  const [unfinishedTasks, setUnfinishedTasks] = useState<PomodoroTask[]>([]);
  const [finishedInterval, setFinishedInterval] = useState<(Interval & { duration: number }) | undefined>(undefined);

  useEffect(() => {
    getTaskMap().then((tasks) => {
      const taskArray = Array.from(tasks.values());
      const unfinished = taskArray.filter((t) => !t.completedAt);
      setUnfinishedTasks(unfinished);

      const task = currentInterval.type === 'task' ? currentInterval.task : undefined;
      if (!task) return;

      // update the total time spent on the task
      const timeSpent = duration(currentInterval.parts);
      task.totalTimeSpent += timeSpent;
      setCurrentTask(task);
      setFinishedInterval({ ...currentInterval, duration: timeSpent });
    });
  }, []);

  let markdownContent = '# Interval Completed \n\n';
  if (currentTask !== undefined) {
    // add some task details like time spent, total time, etc
    markdownContent += `## Task: ${currentTask.title} \n\n
    Time spent: ${secondsToTime(finishedInterval?.duration ?? 0)}
    Total time: ${secondsToTime(currentTask.totalTimeSpent)}
    `;
  }
  let usingGiphy = false;

  if (preferences.enableConfetti) {
    exec('open raycast://extensions/raycast/raycast/confetti', function (err) {
      if (err) {
        // handle error
        console.error(err);
        return;
      }
    });
  }

  if (preferences.sound) {
    exec(`afplay /System/Library/Sounds/${preferences.sound}.aiff -v 10 && $$`);
  }

  if (preferences.enableQuote) {
    markdownContent += handleQuote() + '\n\n';
  }

  if (preferences.enableImage) {
    if (preferences.giphyAPIKey) {
      const { isLoading, data } = useFetch(
        `https://api.giphy.com/v1/gifs/random?api_key=${preferences.giphyAPIKey}&tag=${preferences.giphyTag}&rating=${preferences.giphyRating}`,
        {
          keepPreviousData: true,
        }
      );
      if (!isLoading && data) {
        const giphyResponse = data as GiphyResponse;
        markdownContent += `![${giphyResponse.data.title}](${giphyResponse.data.images.fixed_height.url})`;
        usingGiphy = true;
      } else if (isLoading) {
        ('You did it!');
      } else {
        markdownContent += `![${'You did it!'}](${preferences.completionImage})`;
      }
    } else {
      markdownContent += preferences.completionImage
        ? `![${'You did it!'}](${preferences.completionImage})`
        : 'You did it!';
    }
  }

  if (usingGiphy) {
    markdownContent = `![powered by GIPHY](Poweredby_100px-White_VertLogo.png) \n\n` + markdownContent;
  }

  /**
   * The next interval that will run after the current interval
   */
  const executor = getNextIntervalExecutor();
  console.log('next interval executor', executor);
  return (
    <Detail
      navigationTitle={`Interval completed`}
      markdown={markdownContent}
      actions={
        <ActionPanel title="Timer Actions">
          {currentTask && !currentTask.completedAt && (
            <ActionPanel.Section title="Current Task">
              <Action
                title="Continue Task"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  // Continue the current task with a new interval
                  const confirmed = await confirmAlert({
                    title: 'Continue Task?',
                    message: 'This will create a new interval for the current task',
                  });
                  if (!confirmed) return;
                  createAction(() => createInterval('task', false, currentTask))();
                }}
                shortcut={{ modifiers: ['cmd'], key: 'c' }}
              />
              <Action
                title="Complete Task"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  await completeTask(currentTask.id);
                  createAction(executor.onStart)();
                }}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'enter' }}
              />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section title="New Task">
            <Action
              title="Focus on New Task"
              icon={Icon.Plus}
              onAction={() => {
                launchCommand({
                  name: 'task-form',
                  type: LaunchType.UserInitiated,
                });
              }}
              shortcut={{ modifiers: ['cmd'], key: 'n' }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Break Options">
            <Action
              title={executor.title}
              onAction={createAction(executor.onStart)}
              shortcut={{ modifiers: ['cmd'], key: 'b' }}
            />
            <Action
              title={ShortBreakText}
              onAction={createAction(() => createInterval('short-break', true))}
              shortcut={{ modifiers: ['cmd'], key: 's' }}
            />
            <Action
              title={LongBreakText}
              onAction={createAction(() => createInterval('long-break', true))}
              shortcut={{ modifiers: ['cmd'], key: 'l' }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default function Command(props: { launchContext?: { currentInterval: Interval } }) {
  return props.launchContext?.currentInterval ? (
    <EndOfInterval currentInterval={props.launchContext.currentInterval} />
  ) : (
    <ActionsList />
  );
}
