import { Action, Icon, showToast, Toast } from "@raycast/api";
import { startTask, toggleTimer } from "../../lib/tim";
import { useActiveTask } from "../../state/active-task";
import { Task } from "../../types/tim";

export const StartTaskAction: React.FC<{ task: Pick<Task, "id" | "title"> }> = ({ task }) => {
  const [activeTask, setActiveTask] = useActiveTask();
  const isActive = activeTask === task.id;

  const start = async () => {
    try {
      await startTask(task.id);
      setActiveTask(task.id);
      await showToast({
        title: "Task started",
        message: task?.title,
        style: Toast.Style.Success,
      });
    } catch (error) {
      await showToast({
        title: "Task could not be started",
        message: task?.title,
        style: Toast.Style.Failure,
      });
    }
  };

  const stop = async () => {
    try {
      await toggleTimer();
      setActiveTask("");
      await showToast({
        title: "Task stopped",
        message: task?.title,
        style: Toast.Style.Success,
      });
    } catch (error) {
      await showToast({
        title: "Task could not be stopped",
        message: task?.title,
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Action
      title={isActive ? "Stop Task" : "Start Task"}
      icon={isActive ? Icon.Pause : Icon.Play}
      onAction={isActive ? stop : start}
    />
  );
};
