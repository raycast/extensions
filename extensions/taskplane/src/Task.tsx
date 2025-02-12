/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import moment from "moment";
import { API_URL, APP_URL, AuthContext, COLORS } from "./lib";
import { Action, ActionPanel, Detail, Icon, Toast, confirmAlert, showToast, useNavigation, Alert } from "@raycast/api";
import { useContext, useState } from "react";

interface TaskProps {
  refetchTasks?: () => void;
  organizationId: string;
  task: any;
}

export default function Task({ refetchTasks, organizationId, task: initialTask }: TaskProps) {
  const { token } = useContext(AuthContext);
  const { pop } = useNavigation();

  const [task, setTask] = useState<any>(initialTask);

  async function handleUpdateTask(data: any) {
    try {
      const newTask = await axios
        .put(`${API_URL}/tasks/${task.id}`, data, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => res.data);

      setTask({
        ...task,
        ...newTask,
      });

      showToast(Toast.Style.Success, "Task updated");

      if (refetchTasks) {
        refetchTasks();
      }
    } catch {
      showToast(Toast.Style.Failure, "Failed to update task");
    }
  }

  async function handleDeleteTask() {
    const shouldDelete = await confirmAlert({
      message: "Are you sure you want to delete this task?",
      title: "Delete task",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Yes, delete",
      },
      dismissAction: {
        title: "Cancel",
      },
      icon: {
        tintColor: COLORS.RED,
        source: Icon.Trash,
      },
    });

    if (shouldDelete) {
      try {
        await axios.delete(`${API_URL}/tasks/${task.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        showToast(Toast.Style.Success, "Deleted task");

        if (refetchTasks) {
          refetchTasks();
        }

        pop();
      } catch {
        showToast(Toast.Style.Failure, "Failed to delete task");
      }
    }
  }

  return (
    <Detail
      navigationTitle={`#${task?.ref}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`${APP_URL}/${organizationId}/tasks?task=${task?.ref}`}
            title="Open Task"
            icon={Icon.Link}
          />

          <Action
            onAction={() => {
              handleUpdateTask({ isCompleted: !task.isCompleted });
            }}
            icon={{ source: task.isCompleted ? "check-circle.svg" : "check-circle-solid.svg", tintColor: COLORS.GREEN }}
            title={`Mark as ${task.isCompleted ? "Not Completed" : "Completed"}`}
          />

          <Action
            onAction={() => {
              handleDeleteTask();
            }}
            shortcut={{ key: "backspace", modifiers: ["cmd"] }}
            title="Delete Task"
            icon={{
              tintColor: COLORS.RED,
              source: Icon.Trash,
            }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Task ID" text={`#${task?.ref}`} />

          <Detail.Metadata.Label
            icon={{
              source: task?.isCompleted ? "check-circle-solid.svg" : "check-circle.svg",
              tintColor: COLORS.GREEN,
            }}
            text={task?.isCompleted ? "Completed" : "Not completed"}
            title="Completed"
          />

          {task?.tags?.length ? (
            <Detail.Metadata.TagList title="Tags">
              {task.tags.map((tag: any) => {
                console.log(tag);
                return <Detail.Metadata.TagList.Item color={`rgb(${tag.color})`} text={tag.title} key={tag.id} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {task?.members?.length ? (
            <Detail.Metadata.TagList title="Members">
              {task.members.map((member: any) => (
                <Detail.Metadata.TagList.Item text={member.account.name} key={member.id} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            text={task?.dueDate ? moment(task.dueDate).format("MMM DD, YYYY") : "None"}
            icon={Icon.Calendar}
            title="Due date"
          />

          <Detail.Metadata.Label text={task?.Priority ?? "None"} icon={Icon.ExclamationMark} title="Priority" />

          <Detail.Metadata.Label text={(task?._count.subTasks || "None").toString()} icon={Icon.Dot} title="Subtasks" />
          <Detail.Metadata.Label
            text={(task?._count.comments || "None").toString()}
            icon={Icon.Bubble}
            title="Comments"
          />

          <Detail.Metadata.Label title="Opened" text={moment(task?.createdAt).format("MMM DD, YYYY")} />
          <Detail.Metadata.Label title="Updated" text={moment(task?.updatedAt).fromNow()} />
        </Detail.Metadata>
      }
      markdown={`## ${task?.title}

${task?.description ?? "_No description_"}`}
    />
  );
}
