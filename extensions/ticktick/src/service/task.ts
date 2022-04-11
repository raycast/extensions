import sort from "../utils/sort";

export interface Task {
  id: string;
  title: string;
  priority: 0 | 1 | 3 | 5 | undefined;
  projectId: string;
  content?: string;
  desc?: string;
  items?: ChecklistItem[];
  kind?: TaskKind;
}

export interface ChecklistItem {
  status: number;
  isAllDay: boolean;
  startDate: string;
  title: string;
  id: string;
  sortOrder: number;
}

export interface Section {
  id: string;
  name: string;
  children: Task[];
}

export enum TaskKind {
  Text = "TEXT",
  Checklist = "CHECKLIST",
  Note = "NOTE",
}

export const hasItems = (task: Task) => {
  const items = task.items;
  return items && items.length > 0;
};

export const isChecklistModeTask = (task: Task) => {
  if (task.kind === TaskKind.Note) {
    return false;
  }
  return hasItems(task);
};

export const getTaskDetailMarkdownContent = (task: Task) => {
  let content = "";
  if (isChecklistModeTask(task)) {
    // https://commonmark.org/ line break need two \n
    content = (task.desc || "").replace(/\n/g, "\n\n");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const items = [...task.items!];
    items.sort(sort.checklist).forEach((item) => {
      content += `\n- [${item.status === 0 ? " " : "x"}] ${item.title}`;
    });
  } else {
    // https://commonmark.org/ line break need two \n
    content = (task.content || "").replace(/\n/g, "\n\n");
  }
  const title = `# ${task.title || ""}`;
  return `${title}\n\n${content}`;
};
