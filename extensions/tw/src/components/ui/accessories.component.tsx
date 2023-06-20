import { useEffect, useState } from "react";
import { Color, Icon } from "@raycast/api";
import { TaskDecorator } from "../../hooks/task.hook";
import { priorities } from "../../core/helpers/ui.helper";
import { ItemAccessory } from "../../core/types";
import { fmtDate, toDate } from "../../core/helpers/date.helper";
import { dueColor } from "../../core/helpers/fmt.helper";

export function useAccessories(task: TaskDecorator) {
  const [accessories, setAccessories] = useState<ItemAccessory[]>([
    {
      icon: {
        source: Icon.CircleProgress,
        tintColor: Color.SecondaryText,
      },
      tooltip: "Loading..",
    },
  ]);

  useEffect(() => {
    const list: ItemAccessory[] = [];

    if (task.task.end) {
      list.push({
        text: { value: fmtDate(task.task.end), color: Color.Magenta },
        tooltip: "End",
      });
    } else if (task.task.due) {
      list.push({
        tag: { value: fmtDate(task.task.due), color: dueColor(task.task.due) },
        tooltip: "Due",
      });
    }

    if (task.task.project) {
      list.push({
        text: {
          value: task.props.project,
          color: Color.Green,
        },
        tooltip: "Project",
      });
    }

    if (task.task.tags?.length) {
      list.push({
        text: {
          value: task.props.tagsAsString,
          color: Color.Orange,
        },
        tooltip: "Tags",
      });
    }

    if (task.task.priority) {
      list.push({
        text: {
          value: priorities[task.task.priority].abbr,
          color: Color.Yellow,
        },
        tooltip: "Priority",
      });
    }

    list.push({
      date: toDate(task.task.entry),
      tooltip: "Created",
    });

    setAccessories(list);
  }, [task.task]);

  return accessories;
}
