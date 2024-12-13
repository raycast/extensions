import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useState } from 'react';
import { getTaskMap, updateTask, useTaskStorage } from '../../lib/storage';
import { PomodoroTask } from '../../lib/types';

type SubTaskListProps = {
  parentTask: PomodoroTask;
};

export default function SubTaskList({ parentTask }: SubTaskListProps) {
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const {
    data: subTasks,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const taskMap = await getTaskMap();
      return taskMap.get(parentTask.id)?.subTasks ?? [];
    },
    [],
    { keepPreviousData: true }
  );

  const handleToggleSubTask = async (subTaskId: string) => {
    const subTasks = parentTask?.subTasks.map((st) => (st.id === subTaskId ? { ...st, completed: !st.completed } : st));
    parentTask.subTasks = subTasks;
    await updateTask(parentTask);
    revalidate();
  };

  const handleParentTaskToggle = async () => {
    parentTask.completedAt = parentTask.completedAt ? undefined : new Date().toISOString();
    parentTask.subTasks = parentTask.subTasks.map((st) => ({ ...st, completed: parentTask.completedAt !== undefined }));
    await updateTask(parentTask);
    revalidate();
  };

  return (
    <List
      navigationTitle={`${parentTask.title} - Subtasks`}
      isLoading={isLoading}
      onSelectionChange={(id) => setHighlightedTaskId(id)}
      selectedItemId={highlightedTaskId ?? undefined}
    >
      <List.Section title="Subtasks" subtitle={`${subTasks?.filter((st) => st.completed).length}/${subTasks?.length}`}>
        {subTasks?.map((subTask) => (
          <List.Item
            key={subTask.id}
            title={subTask.title}
            icon={subTask.completed ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel>
                <Action
                  title={subTask.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                  onAction={() => handleToggleSubTask(subTask.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Task Details">
        <List.Item
          title={parentTask.title}
          accessories={[{ text: parentTask.completedAt ? 'Completed' : 'In Progress' }]}
          actions={
            <ActionPanel>
              <Action
                title={parentTask.completedAt ? 'Mark as Incomplete' : 'Mark as Complete'}
                onAction={handleParentTaskToggle}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
