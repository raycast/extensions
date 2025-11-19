import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { attio, parseErrorMessage } from "./attio";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { Task } from "attio-js/dist/commonjs/models/components/task";
import { differenceInDays, format, formatDistanceToNow, isBefore, isToday } from "date-fns";
import { useMemo } from "react";

const buildAccessories = (task: Task, currentDate: Date) => {
  const accessories: List.Item.Accessory[] = [];
  const { deadlineAt, linkedRecords, assignees } = task;
  if (deadlineAt) {
    const date = new Date(deadlineAt);
    let value = "Due ";
    const color = !isToday(date) && isBefore(date, currentDate) ? Color.Red : Color.Orange;

    const days = Math.abs(differenceInDays(date, currentDate));
    if (days >= 5) {
      value += format(date, "MMM d, yyyy");
    } else if (isToday(date)) {
      value += "today";
    } else {
      value += formatDistanceToNow(date, { addSuffix: true });
    }
    accessories.push({ text: { value, color } });
  }
  accessories.push({
    icon: Icon.Document,
    text: linkedRecords.length.toString(),
    tooltip: `${linkedRecords.length} records`,
  });
  accessories.push({
    icon: Icon.TwoPeople,
    text: assignees.length.toString(),
    tooltip: `${assignees.length} assignees`,
  });
  return accessories;
};
export default function Tasks() {
  const {
    isLoading,
    data: tasks,
    error,
    mutate,
  } = useCachedPromise(
    async () => {
      const { data } = await attio.tasks.list({});
      return data;
    },
    [],
    { initialData: [] },
  );
  const currentDate = useMemo(() => new Date(), []);
  const toggleTask = async (task: Task) => {
    const { taskId } = task.id;
    const toast = await showToast(Toast.Style.Animated, "Toggling", taskId);
    try {
      const { isCompleted } = task;
      await mutate(
        attio.tasks.update({
          taskId,
          requestBody: {
            data: {
              isCompleted: !isCompleted,
            },
          },
        }),
        {
          optimisticUpdate(data) {
            return data.map((t) => (t.id.taskId === taskId ? { ...t, isCompleted: !isCompleted } : t));
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Toggled";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = parseErrorMessage(error);
    }
  };
  const confirmAndDelete = async (task: Task) => {
    const options: Alert.Options = {
      title: "Delete task",
      message: "Are you sure you want to delete this task?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (!(await confirmAlert(options))) return;
    const { taskId } = task.id;
    const toast = await showToast(Toast.Style.Animated, "Deleting", taskId);
    try {
      await mutate(attio.tasks.delete({ taskId }), {
        optimisticUpdate(data) {
          return data.filter((t) => t.id.taskId !== taskId);
        },
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = parseErrorMessage(error);
    }
  };
  const TaskItem = ({ task }: { task: Task }) => (
    <List.Item
      icon={task.isCompleted ? Icon.CheckCircle : Icon.Circle}
      title={task.contentPlaintext}
      accessories={buildAccessories(task, currentDate)}
      actions={
        <ActionPanel>
          <Action
            icon={task.isCompleted ? Icon.Circle : Icon.CheckCircle}
            title={task.isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
            onAction={() => toggleTask(task)}
          />
          <Action.Push icon={Icon.Plus} title="New Task" target={<NewTask />} onPop={mutate} />
          <Action
            icon={Icon.Trash}
            title="Delete Task"
            onAction={() => confirmAndDelete(task)}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        </ActionPanel>
      }
    />
  );

  const groupedTasks = tasks.reduce(
    (acc, task) => {
      if (task.isCompleted) {
        acc.completed.push(task);
      } else if (!task.deadlineAt || isToday(task.deadlineAt) || isBefore(task.deadlineAt, currentDate)) {
        acc.today.push(task);
      } else {
        acc.upcoming.push(task);
      }
      return acc;
    },
    { today: [], upcoming: [], completed: [] } as { today: Task[]; upcoming: Task[]; completed: Task[] },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !tasks.length && !error ? (
        <List.EmptyView icon="empty/task.svg" title="Tasks" description="No tasks yet!" />
      ) : (
        <>
          <List.Section title="Today" subtitle={groupedTasks.today.length.toString()}>
            {groupedTasks.today.map((task) => (
              <TaskItem key={task.id.taskId} task={task} />
            ))}
          </List.Section>
          <List.Section title="Upcoming" subtitle={groupedTasks.upcoming.length.toString()}>
            {groupedTasks.upcoming.map((task) => (
              <TaskItem key={task.id.taskId} task={task} />
            ))}
          </List.Section>
          <List.Section title="Completed" subtitle={groupedTasks.completed.length.toString()}>
            {groupedTasks.completed.map((task) => (
              <TaskItem key={task.id.taskId} task={task} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function NewTask() {
  type FormValues = {
    content: string;
    deadlineAt: Date | null;
    isCompleted: boolean;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating");
      try {
        await attio.tasks.create({
          data: {
            ...values,
            deadlineAt: values.deadlineAt ? values.deadlineAt.toISOString() : null,
            format: "plaintext",
            linkedRecords: [],
            assignees: [],
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = parseErrorMessage(error);
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle={`Tasks / Add`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="New Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Content" placeholder="Tweet about @Attio" {...itemProps.content} />
      <Form.DatePicker title="Deadline" {...itemProps.deadlineAt} />
      <Form.Checkbox label="Completed" {...itemProps.isCompleted} />
    </Form>
  );
}
