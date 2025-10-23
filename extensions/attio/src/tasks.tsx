import { useCachedPromise } from "@raycast/utils";
import { attio, parseErrorMessage } from "./attio";
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { Task } from "attio-js/dist/commonjs/models/components/task";
import { differenceInDays, format, formatDistanceToNow, isBefore, isToday } from "date-fns";

const buildAccessories = (task: Task) => {
  const accessories: List.Item.Accessory[] = []
  const {deadlineAt, linkedRecords,assignees} = task
  if (deadlineAt) {
    const date = new Date(deadlineAt);
    let value = "Due ";
    const color = !isToday(date) && isBefore(date, new Date()) ? Color.Red : Color.Orange;
    
    const days = Math.abs(differenceInDays(date, new Date()));
    if (days >= 5) {
      value += format(date, 'MMM d, yyyy')
    } else if (isToday(date)) {
      value += "today";
    } else {
      value += formatDistanceToNow(date, {addSuffix: true})
    }
    accessories.push({text: {value, color}})
  }
  accessories.push({icon: Icon.Document, text: linkedRecords.length.toString(), tooltip: `${linkedRecords.length} records`})
  accessories.push({icon: Icon.TwoPeople, text: assignees.length.toString(), tooltip: `${assignees.length} assignees`})
  return accessories;
}
export default function Tasks() {
  const {
    isLoading,
    data: tasks,
    error,
    mutate
  } = useCachedPromise(
    async () => {
      const { data } = await attio.tasks.list({});
      return data;
    },
    [],
    { initialData: [] },
  );
  const toggleTask = async (task: Task) => {
    const {taskId} = task.id;
    const toast = await showToast(Toast.Style.Animated, "Toggling", taskId);
    try {
      const {isCompleted} = task;
      await mutate(
        attio.tasks.update({
          taskId,
          requestBody: {
            data: {
              isCompleted: !isCompleted
            }
          }
        }), {
          optimisticUpdate(data) {
            return data.map(t => t.id.taskId===taskId ? ({...t, isCompleted: !isCompleted}) : t)
          },
          shouldRevalidateAfter: false
        }
      )
    toast.style = Toast.Style.Success;
      toast.title = "Toggled";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = parseErrorMessage(error);
    }
  }
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
    const {taskId} = task.id
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
  }
  const TaskItem = ({task}:{task: Task}) => <List.Item icon={task.isCompleted ? Icon.CheckCircle : Icon.Circle} title={task.contentPlaintext} accessories={buildAccessories(task)} actions={<ActionPanel>
          <Action icon={task.isCompleted ? Icon.Circle : Icon.CheckCircle} title={task.isCompleted ? "Mark as Incomplete" : "Mark as Complete"} onAction={() => toggleTask(task)} />
          <Action icon={Icon.Trash} title="Delete Task" onAction={() => confirmAndDelete(task)} style={Action.Style.Destructive} />
        </ActionPanel>} />
return (
    <List isLoading={isLoading}>
      {!isLoading && !tasks.length && !error ? (
        <List.EmptyView icon="empty/task.svg" title="Tasks" description="No tasks yet!" />
      ) : (
        <>
        <List.Section title="Today">
          {tasks.filter(task => !task.isCompleted && (!task.deadlineAt || isToday(task.deadlineAt))).map(task => <TaskItem key={task.id.taskId} task={task} />)}
        </List.Section>
        <List.Section title="Upcoming">
          {tasks.filter(task => !task.isCompleted && task.deadlineAt && !isToday(task.deadlineAt)).map(task => <TaskItem key={task.id.taskId} task={task} />)}
        </List.Section>
        <List.Section title="Completed">
          {tasks.filter(task => task.isCompleted).map(task => <TaskItem key={task.id.taskId} task={task} />)}
        </List.Section>
        </>
      )}
    </List>
  );
}
