import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { TaskDecorator, TaskDetailsProp } from "../../hooks/task.hook";
import { Task } from "../../core/types";

export function useDetails(task: TaskDecorator) {
  const [details, setDetails] = useState<JSX.Element[]>([]);

  useEffect(() => {
    setDetails(
      [
        "project",
        "description",
        "tags",
        "sep",
        "status",
        "state",
        "priority",
        "urgency",
        "sep",
        "end",
        "due",
        "start",
        "modified",
        "entry",
      ]
        .map((key, i) =>
          key === "sep" ? (
            <List.Item.Detail.Metadata.Separator key={`task_${task.uuid}_metadata_${i}_sep`} />
          ) : (
            task.task[key as keyof Task] && (
              <List.Item.Detail.Metadata.Label
                key={`task_${task.uuid}_metadata_${i}_${key}`}
                {...task.details[key as TaskDetailsProp]}
              />
            )
          )
        )
        .filter((e) => e !== null && e !== undefined) as JSX.Element[]
    );
  }, [task.task]);

  return <List.Item.Detail metadata={<List.Item.Detail.Metadata>{...details}</List.Item.Detail.Metadata>} />;
}
