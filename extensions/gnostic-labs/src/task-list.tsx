import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
} from '@raycast/api';
import { showFailureToast, useCachedPromise, useCachedState } from '@raycast/utils';
import { useEffect, useState } from 'react';
import { createInterval, duration, getCurrentInterval, resetInterval } from '../lib/intervals';
import { secondsToTime } from '../lib/secondsToTime';
import { deleteAllTasks, deleteTask, getTaskMap, updateTask } from '../lib/storage';
import type { Interval, PomodoroTask } from '../lib/types';
import SubTaskList from './tasks/subtask-list';
import TaskDetails from './tasks/task-details';

// Add this helper function to format the task detail markdown
function getTaskDetailMarkdown(task: PomodoroTask) {
  return `
## ${task.title}

${
  task.subTasks && task.subTasks.length > 0
    ? '\n### Subtasks\n' + task.subTasks.map((st) => `- [${st.completed ? 'x' : ' '}] ${st.title}`).join('\n')
    : ''
}
`;
}

export default function ViewTaskList() {
  const [highlightedTaskId, setHighlightedTaskId] = useState<string>('');
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(getCurrentInterval());
  const [showUnfinishedOnly, setShowUnfinishedOnly] = useCachedState('SHOW_ALL_TASKS', true);

  const {
    data: allTasks,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const taskMap = await getTaskMap();
      return Array.from(taskMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },
    [],
    { keepPreviousData: true }
  );

  // Update the current task's total time spent and time remaining
  useEffect(() => {
    const intervalId = setInterval(() => {
      const interval = getCurrentInterval();
      setCurrentInterval(interval);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const tasks = showUnfinishedOnly ? allTasks?.filter((task) => !task.completedAt) ?? [] : allTasks;
  const currentTask = currentInterval?.task;
  const isActiveTask = highlightedTaskId === currentTask?.id;

  const handleDeleteTask = async (taskId: string) => {
    try {
      const confirmDelete = await confirmAlert({
        title: 'Delete Task',
        message: 'Are you sure you want to delete this task? This action cannot be undone.',
        primaryAction: {
          title: 'Delete',
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmDelete) {
        await deleteTask(taskId);
        revalidate();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      showFailureToast('Failed to delete task');
    }
  };

  const handleDeleteAllTasks = async () => {
    const confirmDelete = await confirmAlert({
      title: 'Delete All Tasks',
      message: 'Are you sure you want to delete all tasks? This action cannot be undone.',
      primaryAction: {
        title: 'Delete All',
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmDelete) {
      await deleteAllTasks();
    }
  };

  const handleToggleComplete = async (parentTask: PomodoroTask) => {
    // if active task, stop timer
    if (parentTask.id === currentInterval?.task?.id) {
      const confirmed = await confirmAlert({
        title: 'Stop Timer?',
        message: 'Marking a task as complete will stop the timer for this task.',
        primaryAction: {
          title: 'Yes, Stop Timer',
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (confirmed) {
        resetInterval();
        setCurrentInterval(undefined);
      } else {
        return;
      }
    }
    if (parentTask.completedAt) {
      parentTask.completedAt = undefined;
      // update the task (localStorage) to make sure the revalidation gets the most recent data
    } else {
      parentTask.completedAt = new Date().toISOString();
    }

    // update all subtasks to match parent task status
    if (parentTask.subTasks) {
      parentTask.subTasks = parentTask.subTasks.map((st) => ({
        ...st,
        completed: parentTask.completedAt !== undefined,
      }));
    }

    await updateTask(parentTask);

    revalidate();
  };

  const handleTaskSelection = (id: string) => {
    console.log({ highlightedTaskId: id, currentTaskId: currentTask?.id });
    setHighlightedTaskId(id);
  };

  if (!tasks || tasks.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clock}
          title="No Tasks Yet"
          description="Create a new task timer to get started"
          actions={
            <ActionPanel>
              <Action
                title="Create Task"
                icon={Icon.Plus}
                onAction={() => {
                  launchCommand({
                    name: 'task-form',
                    type: LaunchType.UserInitiated,
                  });
                }}
              />
              {showUnfinishedOnly && tasks && tasks.length > 0 && (
                <Action title="Show All Tasks" icon={Icon.List} onAction={() => setShowUnfinishedOnly(false)} />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isShowingDetail={true}
      selectedItemId={highlightedTaskId}
      throttle={true}
      isLoading={isLoading}
      onSelectionChange={(id) => handleTaskSelection(id ?? '')}
    >
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.title}
          icon={task.completedAt ? Icon.CheckCircle : Icon.Circle}
          id={task.id}
          detail={
            <List.Item.Detail
              markdown={getTaskDetailMarkdown(task)}
              metadata={
                <List.Item.Detail.Metadata>
                  {currentInterval && isActiveTask && (
                    <>
                      <List.Item.Detail.Metadata.Label
                        title="Time Remaining"
                        text={secondsToTime(currentInterval.intervalLength - duration(currentInterval.parts))}
                        icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
                      />
                      <List.Item.Detail.Metadata.Separator />
                    </>
                  )}
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={task.completedAt ? 'Completed' : isActiveTask ? `In Progress` : 'Incomplete'}
                    icon={
                      task.completedAt
                        ? { source: Icon.CheckCircle, tintColor: Color.Green }
                        : isActiveTask
                        ? { source: Icon.Circle, tintColor: Color.Yellow }
                        : Icon.Circle
                    }
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Created"
                    text={new Date(task.createdAt).toLocaleString()}
                    icon={Icon.Calendar}
                  />
                  {task.updatedAt !== task.createdAt && (
                    <List.Item.Detail.Metadata.Label
                      title="Updated"
                      text={new Date(task.updatedAt).toLocaleString()}
                      icon={Icon.Calendar}
                    />
                  )}
                  {task.completedAt && (
                    <List.Item.Detail.Metadata.Label
                      title="Completed"
                      text={new Date(task.completedAt).toLocaleString()}
                      icon={{ source: Icon.Calendar, tintColor: Color.Green }}
                    />
                  )}
                  {task.subTasks && task.subTasks.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Subtasks"
                        text={`${task.subTasks.filter((st) => st.completed).length}/${task.subTasks.length} completed`}
                        icon={Icon.List}
                      />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {!task.completedAt && (
                <>
                  {isActiveTask ? (
                    <Action
                      title={'Control Timer'}
                      icon={Icon.Clock}
                      onAction={() => {
                        launchCommand({
                          name: 'pomodoro-control-timer',
                          type: LaunchType.UserInitiated,
                        });
                      }}
                    />
                  ) : (
                    currentInterval === undefined && (
                      <Action
                        title={`Start Timer for ${task.title}`}
                        icon={Icon.Clock}
                        onAction={async () => {
                          if (
                            await confirmAlert({
                              title: 'Start Timer?',
                              message: `Are you sure you want to start a new timer for ${task.title}?`,
                            })
                          ) {
                            const interval = createInterval('task', true, task);
                            setCurrentInterval(interval);
                            setHighlightedTaskId(task.id);
                            showToast({ title: 'Task Timer Started', message: task.title });
                          }
                        }}
                      />
                    )
                  )}
                </>
              )}

              {task.subTasks && task.subTasks.length > 0 && (
                <Action.Push
                  title="View Subtasks"
                  icon={Icon.List}
                  target={<SubTaskList parentTask={task} />}
                  shortcut={{ modifiers: ['cmd'], key: 's' }}
                />
              )}
              <Action.Push
                title="View Task Details"
                icon={Icon.Eye}
                target={<TaskDetails taskId={task.id} />}
                shortcut={{ modifiers: ['cmd'], key: 'd' }}
              />
              <Action
                title={task.completedAt ? 'Mark as Incomplete' : 'Mark as Complete'}
                icon={task.completedAt ? Icon.Circle : Icon.CheckCircle}
                onAction={() => handleToggleComplete(task)}
                shortcut={{ modifiers: ['cmd'], key: 'return' }}
              />

              <Action
                title="Edit Task"
                icon={Icon.Pencil}
                onAction={() => {
                  launchCommand({
                    name: 'task-form',
                    type: LaunchType.UserInitiated,
                    context: { editTask: task },
                  });
                }}
                shortcut={{ modifiers: ['cmd'], key: 'e' }}
              />
              <Action
                title={showUnfinishedOnly ? 'Show All Tasks' : 'Show Only Incomplete Tasks'}
                icon={Icon.List}
                onAction={() => setShowUnfinishedOnly(!showUnfinishedOnly)}
              />
              <Action
                title="Delete Task"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'delete' }}
                onAction={() => handleDeleteTask(task.id)}
              />
              <Action
                title="Delete All Tasks"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleDeleteAllTasks}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
