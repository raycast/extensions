import { Color } from "@raycast/api";
import { getDate } from "../core/helpers/date.helper";
import {
  getId,
  getState,
  project as asProject,
  withTags,
  priority,
  urgency,
  dueColor,
} from "../core/helpers/fmt.helper";
import { situations, statuses } from "../core/helpers/ui.helper";
import { Task } from "../core/types/task.model";

const decorate = (
  task: Task,
  id = getId(task),
  state = getState(task),
  situation = state ?? task.status ?? "pending",
  statusView = statuses[task.status ?? "pending"],
  situationView = situations[situation],
  tags = withTags(task.tags),
  project = task.project ? asProject(task.project) : "",
  tooltip = [statusView.label, state ? `(${situationView.label})` : ""].join(" ")
) => ({
  task,
  id,
  uuid: task.uuid,
  props: {
    state,
    situation,
    situationView,
    statusView,
    project,
    tags,
    tagsAsString: tags.join(" "),
    header: () => ({
      key: `task_${task.uuid}`,
      id: task.uuid,
      title: task.description,
      subtitle: `#${id}`,
      keywords: [id, project, ...tags],
      icon: {
        value: {
          source: statusView.icon,
          tintColor: situationView.color,
        },
        tooltip,
      },
    }),
  },
  details: {
    description: {
      title: "Description",
      text: task.description,
    },
    project: {
      title: "Project",
      text: {
        value: project,
        color: Color.Green,
      },
    },
    tags: {
      title: "Tags",
      text: {
        value: tags.join(" "),
        color: Color.Orange,
      },
    },
    status: {
      title: "Status",
      text: {
        value: tooltip,
        color: situationView.color,
      },
    },
    priority: {
      title: "Priority",
      text: priority(task.priority),
    },
    urgency: {
      title: "Urgency",
      text: {
        value: urgency(task.urgency),
        color: Color.Magenta,
      },
    },
    end: {
      title: "Ended",
      text: {
        value: String(getDate(task.end)),
        color: Color.Magenta,
      },
    },
    due: {
      title: "Due",
      text: {
        value: String(getDate(task.due)),
        color: dueColor(task.due),
      },
    },
    start: {
      title: "Started",
      text: getDate(task.start),
    },
    modified: {
      title: "Modified",
      text: getDate(task.modified),
    },
    entry: {
      title: "Created",
      text: getDate(task.entry),
    },
  },
});

export type TaskDetailsProp = keyof ReturnType<typeof decorate>["details"];

export type TaskDecorator = ReturnType<typeof decorate>;

export const useTask = (item: Task) => decorate(item);
