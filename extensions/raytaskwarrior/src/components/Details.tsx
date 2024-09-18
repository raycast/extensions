import { useMemo } from "react";
import { Action, ActionPanel, Color, Detail, popToRoot, showToast, Toast } from "@raycast/api";
import { Priority, Task } from "../types/types";
import { formatDate, formatDueDate, getActiveTime } from "../utils/dateFormatters";
import Modify from "./Modify";
import AddTaskAdvanced from "../addTaskAdvanced";
import { deleteTask, markTaskAsDone, updateTask } from "../api";

const getRandomColor = (availableColors: Color[]): Color => {
  const randomIndex = Math.floor(Math.random() * availableColors.length);
  return availableColors[randomIndex];
};

const Details = (props: { task: Task }) => {
  const { task } = props;

  const initialColors = (Object.values(Color) as Color[]).filter(
    (color) => color !== Color.PrimaryText && color !== Color.SecondaryText
  );

  const assignRandomColorsToTags = (tags: string[]): Map<string, Color> => {
    const tagColorMap = new Map<string, Color>();
    const availableColors = [...initialColors];

    tags.forEach((tag) => {
      if (availableColors.length === 0) {
        availableColors.push(...initialColors); // Regenerate available colors
      }

      const randomColor = getRandomColor(availableColors);
      tagColorMap.set(tag, randomColor);

      // Remove the used color
      const index = availableColors.indexOf(randomColor);
      availableColors.splice(index, 1);
    });

    return tagColorMap;
  };

  const tagColorMap = useMemo(() => assignRandomColorsToTags(task.tags ? [...task.tags] : []), [task.tags]);

  const showCustomToast = async (title: string, style: Toast.Style, message: string) => {
    await showToast({
      title: title,
      style: style,
      message: message,
    });
  };

  const markTaskAsDoneAndGoBack = async (taskUuid: string) => {
    await markTaskAsDone(taskUuid);
    showCustomToast("Success", Toast.Style.Success, "Task marked as done");
    popToRoot();
  };

  const deleteAndGoBack = async (uuid: string) => {
    await deleteTask(uuid);
    showCustomToast("Success", Toast.Style.Success, "Task Deleted");
    popToRoot();
  };

  const parsePriority = (priority: string): Priority | "" | undefined => {
    switch (priority) {
      case "High":
        return Priority.H;
      case "Medium":
        return Priority.M;
      case "Low":
        return Priority.L;
      case "None":
        return "";
      default:
        return undefined;
    }
  };

  const startOrStopTask = async (task: Task) => {
    const action = task.tags && Array.from(task.tags).includes("next") ? "-next" : "+next";
    updateTask(task.uuid, undefined, undefined, [action]);
    popToRoot();
  };

  return (
    <Detail
      navigationTitle={task.description}
      markdown={`# ${task.description}`}
      actions={
        <ActionPanel>
          <Action.Push key="Modify" title="Modify" target={<Modify task={task} />} />

          <Action title="Mark as Done" onAction={() => markTaskAsDoneAndGoBack(task.uuid)} />
          <Action
            key="delete"
            title="Delete"
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => deleteAndGoBack(task.uuid)}
          />
          <Action
            key="start"
            title={task.tags && Array.from(task.tags).includes("next") ? "Stop" : "Start"}
            shortcut={{ modifiers: ["ctrl"], key: "s" }}
            onAction={() => startOrStopTask(task)}
          />
          <Action.Push
            key="new"
            title="Add New Task"
            target={<AddTaskAdvanced />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label key="status" title="Status:" text={task.status} />
          {task.project ? <Detail.Metadata.Label key="project" title="Project:" text={task.project} /> : ""}
          {task.priority ? (
            <Detail.Metadata.Label key="priority" title="Priority:" text={parsePriority(task.priority)} />
          ) : (
            ""
          )}
          {task.due ? <Detail.Metadata.Label key="due" title="due:" text={formatDueDate(task.due)} /> : ""}
          <Detail.Metadata.Label key="Urgency" title="Urgency:" text={task.urgency.toLocaleString()} />
          {task.start ? <Detail.Metadata.Label key="start" title="Active for:" text={getActiveTime(task.start)} /> : ""}
          {task.entry ? <Detail.Metadata.Label key="entry" title="Added on:" text={formatDate(task.entry)} /> : ""}
          {task.modified ? (
            <Detail.Metadata.Label key="modified" title="Modified on:" text={formatDate(task.modified)} />
          ) : (
            ""
          )}
          {task.tags ? (
            <Detail.Metadata.TagList key="TagsList" title="tags">
              {Array.from(task.tags).map((tag) => {
                return <Detail.Metadata.TagList.Item key={tag} text={tag} color={tagColorMap.get(tag) || Color.Blue} />;
              })}
            </Detail.Metadata.TagList>
          ) : (
            ""
          )}
        </Detail.Metadata>
      }
    />
  );
};

export default Details;
