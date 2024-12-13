import { Action, ActionPanel, Color, Detail, environment, Icon, launchCommand, LaunchType } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useEffect, useState } from 'react';
import { duration, getCurrentInterval } from '../../lib/intervals';
import { secondsToTime } from '../../lib/secondsToTime';
import { getTaskMap, getTotalTimeSpent } from '../../lib/storage';
import type { Interval } from '../../lib/types';
import SubtaskList from './subtask-list';

interface TaskDetailsProps {
  taskId: string;
}

/**
 * Display the details of a task
 */
export default function TaskDetails({ taskId }: TaskDetailsProps) {
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(undefined);

  const { data: currentTask, isLoading } = useCachedPromise(
    async (taskId: string) => {
      const taskMap = await getTaskMap();
      return taskMap?.get(taskId);
    },
    [taskId],
    { keepPreviousData: true }
  );

  if (!currentTask) {
    console.error('No task found for taskId', taskId);
    return <Detail markdown="## No task found" isLoading={isLoading} />;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const interval = getCurrentInterval();
      const _currentTask = interval?.task;
      if (!_currentTask) return;
      if (_currentTask.id === taskId) {
        setCurrentInterval(interval);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [taskId]);

  const isActiveTask = currentInterval?.task && taskId === currentInterval.task.id;

  const getIntervalTimers = (interval: Interval) => {
    const _totalTimeSpent = getTotalTimeSpent(currentTask);
    return {
      currentSession: secondsToTime(duration(interval.parts)),
      timeRemaining: secondsToTime(interval.intervalLength - duration(interval.parts)),
      totalTimeSpent: `${_totalTimeSpent.hours}h ${_totalTimeSpent.minutes}m ${_totalTimeSpent.seconds}s`,
    };
  };

  // Get status details based on task state
  const getStatusDetails = () => {
    if (currentTask.completedAt) {
      return {
        text: 'Completed',
        icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      };
    }
    if (isActiveTask) {
      return {
        text: 'In Progress',
        icon: { source: Icon.Circle, tintColor: Color.Yellow },
      };
    }
    return {
      text: 'Not Completed',
      icon: Icon.Circle,
    };
  };

  const markdown = `
## ${currentTask.title}

${
  currentTask.subTasks && currentTask.subTasks.length > 0
    ? currentTask.subTasks.map((st) => `- [${st.completed ? 'x' : ' '}] ${st.title}`).join('\n')
    : ''
}

${
  environment.isDevelopment && currentInterval
    ? `## Active Interval: ${JSON.stringify(Object.entries(currentInterval), null, 2)}`
    : ''
}
`;

  return (
    <Detail
      navigationTitle={`Task Details: ${currentTask.title}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {isActiveTask && (
            <>
              <Detail.Metadata.Label
                title="Time Remaining"
                text={getIntervalTimers(currentInterval).timeRemaining}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              />
              <Detail.Metadata.Label
                title="Current Session"
                text={getIntervalTimers(currentInterval).currentSession}
                icon={{ source: Icon.Stopwatch, tintColor: Color.Blue }}
              />
              <Detail.Metadata.Separator />
            </>
          )}
          <Detail.Metadata.Label
            title="Total Time Spent"
            text={
              currentInterval
                ? getIntervalTimers(currentInterval).totalTimeSpent
                : secondsToTime(currentTask.totalTimeSpent)
            }
            icon={{ source: Icon.Stopwatch, tintColor: Color.Purple }}
          />
          <Detail.Metadata.Label title="Status" text={getStatusDetails().text} icon={getStatusDetails().icon} />
          <Detail.Metadata.Label
            title="Created"
            text={new Date(currentTask.createdAt).toLocaleString()}
            icon={Icon.Calendar}
          />
          {currentTask.updatedAt !== currentTask.createdAt && (
            <Detail.Metadata.Label
              title="Updated"
              text={new Date(currentTask.updatedAt).toLocaleString()}
              icon={Icon.Calendar}
            />
          )}
          {currentTask.completedAt && (
            <Detail.Metadata.Label
              title="Completed"
              text={new Date(currentTask.completedAt).toLocaleString()}
              icon={{ source: Icon.Calendar, tintColor: Color.Green }}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isActiveTask && (
            <Action
              title="Control Timer"
              icon={Icon.Stopwatch}
              onAction={() => {
                launchCommand({
                  name: 'pomodoro-control-timer',
                  type: LaunchType.UserInitiated,
                });
              }}
            />
          )}
          <Action
            title="Edit Task"
            icon={Icon.Pencil}
            onAction={() => {
              launchCommand({
                name: 'task-form',
                type: LaunchType.UserInitiated,
                context: { editTask: currentTask },
              });
            }}
            shortcut={{ modifiers: ['cmd'], key: 'e' }}
          />
          <Action.Push
            title="View Subtasks"
            icon={Icon.List}
            target={<SubtaskList parentTask={currentTask} />}
            shortcut={{ modifiers: ['cmd'], key: 's' }}
          />
        </ActionPanel>
      }
    />
  );
}
