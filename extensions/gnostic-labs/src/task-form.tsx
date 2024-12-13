import { Action, ActionPanel, Form, showToast, useNavigation, type LaunchProps, type LaunchType } from '@raycast/api';
import { FormValidation, useForm } from '@raycast/utils';
import { useEffect, useState } from 'react';
import { createInterval, preferences } from '../lib/intervals';
import { createNewTask, getTotalTimeSpent, parseSubtasks, updateTask, useTaskStorage } from '../lib/storage';
import { PomodoroTask, type CreateTaskFormData } from '../lib/types';

type TaskFormProps = LaunchProps<{
  launchType: LaunchType.UserInitiated;
  launchContext?: {
    editTask?: PomodoroTask;
  };
  draftValues?: CreateTaskFormData;
}>;

export default function Command({ launchContext, draftValues }: TaskFormProps) {
  const { editTask } = launchContext ?? {};

  const { pop } = useNavigation();

  const { taskMap } = useTaskStorage();
  const unfinishedTasks = Array.from(taskMap.values()).filter((t) => !t.completedAt);

  const { handleSubmit, reset, itemProps, values, setValue } = useForm<CreateTaskFormData & { existingTaskId: string }>(
    {
      onSubmit: async (values) => {
        console.log('form values', values);
        if (selectedTask) {
          const updatedTask: PomodoroTask = {
            ...selectedTask,
            completedAt: values.completed ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
            subTasks: parseSubtasks(selectedTask.id, values.subTasks),
            title: values.title,
            customDuration: values.customDuration ? Number.parseInt(values.customDuration) : undefined,
          };
          await updateTask(updatedTask);
          createInterval('task', true, updatedTask);
          showToast({ title: 'Task Updated & Timer Started', message: updatedTask.title });
        } else {
          const task = await createNewTask(values);
          createInterval('task', true, task);
          showToast({ title: 'Task Created', message: task.title });
        }
        pop();
      },
      initialValues: {
        title: editTask?.title || draftValues?.title || '',
        subTasks: editTask?.subTasks?.map((st) => st.title).join('\n') || draftValues?.subTasks || '',
        customDuration:
          editTask?.customDuration?.toString() ??
          draftValues?.customDuration?.toString() ??
          preferences.focusIntervalDuration,
        existingTaskId: editTask?.id || '',
      },
      validation: {
        title: FormValidation.Required,
        customDuration: (value) => {
          if (value) {
            const duration = Number.parseInt(String(value));
            if (Number.isNaN(duration)) return 'Duration must be number';
            if (duration <= 0) return 'Duration must be positive';
            if (duration > 120) return 'Duration cannot exceed 120 minutes';
          }
        },
      },
    }
  );

  const [selectedTask, setSelectedTask] = useState<PomodoroTask | undefined>(
    values.existingTaskId ? unfinishedTasks.find((t) => t.id === values.existingTaskId) : undefined
  );

  useEffect(() => {
    if (selectedTask) {
      reset({
        title: selectedTask.title,
        subTasks: selectedTask.subTasks?.map((st) => st.title).join('\n') || '',
        customDuration: selectedTask.customDuration?.toString() ?? preferences.focusIntervalDuration,
        existingTaskId: selectedTask.id,
      });
    }
  }, [selectedTask]);

  return (
    <Form
      enableDrafts
      navigationTitle={selectedTask ? 'Edit Task' : 'Create Task'}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={selectedTask ? 'Update & Start Timer' : 'Create Task'} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {!editTask && unfinishedTasks.length > 0 && (
        <>
          <Form.Dropdown
            title="Select Existing Task"
            {...itemProps.existingTaskId}
            onChange={(e) => {
              setSelectedTask(unfinishedTasks.find((t) => t.id === e));
            }}
          >
            <Form.Dropdown.Item value="" title="Create New Task" />
            {unfinishedTasks.map((task) => (
              <Form.Dropdown.Item
                key={task.id}
                value={task.id}
                title={`${task.title} (${getTotalTimeSpent(task).hours}:${getTotalTimeSpent(task).minutes}:${
                  getTotalTimeSpent(task).seconds
                })`}
              />
            ))}
          </Form.Dropdown>
          <Form.Separator />
        </>
      )}

      <Form.TextField title="Task Title" placeholder="What are you working on?" {...itemProps.title} />
      <Form.TextField
        id="customDuration"
        title="Duration (minutes)"
        placeholder={`Default: ${preferences.focusIntervalDuration} minutes`}
      />
      <Form.TextArea title="Sub Tasks" placeholder="Add sub-tasks (one per line)" {...itemProps.subTasks} />

      {selectedTask && <Form.Checkbox label="Mark as Completed" {...itemProps.completed} />}

      <Form.Separator />
      <Form.Description
        title="Tips"
        text={`Track progress by adding subtasks (one per line). Leave duration empty to use default (${preferences.focusIntervalDuration} minutes).`}
      />
    </Form>
  );
}
