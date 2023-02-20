import { Action, Icon, showToast, Toast } from "@raycast/api";
import { startTask } from "../../lib/tim";
import { Task } from "../../types/tim";

export const StartTaskAction: React.FC<{ task: Task }> = ({ task }) => {
  const handleAction = () =>
    startTask(task.id)
      .then(() =>
        showToast({
          title: "Task started",
          message: task?.title,
          style: Toast.Style.Success,
        })
      )
      .catch(() => {
        showToast({
          title: "Task could not be started",
          message: task?.title,
          style: Toast.Style.Failure,
        });
      });

  return <Action title="Start Task" icon={Icon.Play} onAction={handleAction} />;
};
