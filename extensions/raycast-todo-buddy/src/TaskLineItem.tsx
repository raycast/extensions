import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { FC } from "react";
import { TaskEditMenu } from "./actions/edit";
import { getConfig } from "./config";
import { determinePriority } from "./date";
import { nameToColor } from "./nameToColor";
import { priorityToColor } from "./priorityToColor";
import { findTags } from "./tag";
import { Task, Tag } from "./types";
import { DifficultyIconMap, DifficultyColorMap } from "./constants";

type Props = {
  task: Task;
  refetchList: () => void;
  allTags: Tag[];
};

export const TaskLineItem: FC<Props> = ({ task, refetchList, allTags }) => {
  const { language } = getConfig();
  const tags = findTags(task, allTags);

  const getDifficultyColor = () => {
    // If the task is completed, always use green color
    if (task.completed) {
      return Color.Green;
    }
    return DifficultyColorMap[task.difficulty as keyof typeof DifficultyColorMap];
  };
  return (
    <List.Item
      icon={
        task.completed
          ? {
              source: Icon.CheckCircle,
              tintColor: Color.Green,
            }
          : Icon.Circle
      }
      key={task.id}
      title={task.text}
      actions={
        <ActionPanel title="Todo Buddy">
          <TaskEditMenu item={task} refetchList={refetchList} />
        </ActionPanel>
      }
      accessories={[
        {
          icon: {
            source: DifficultyIconMap[task.difficulty as keyof typeof DifficultyIconMap],
            tintColor: getDifficultyColor(),
          },
        },
        ...tags.map((tag) => ({
          tag: {
            value: tag.name,
            color: nameToColor(tag.name),
          },
        })),
        {
          text: task.date
            ? {
                color: priorityToColor(determinePriority(task.date)),
                value: new Date(task.date).toLocaleDateString(language),
              }
            : null,
        },
      ]}
    />
  );
};
