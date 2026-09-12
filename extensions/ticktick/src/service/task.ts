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
  tags: string[];
  startDate?: string;
  dueDate?: string;
  isAllDay: boolean;
  isFloating: boolean;
  timeZone: string;
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

const execIterable = (str: string, reg: RegExp, cb: (result: RegExpExecArray) => void) => {
  let result = reg.exec(str);
  while (result !== null) {
    cb(result);
    result = reg.exec(str);
  }
};

const getFilePrettyContent = (content: string) => {
  let newContent = content;
  const execCallback = (result: RegExpExecArray) => {
    const replace = result[0];
    const type = result[1];
    const fileType = /image/i.test(type) ? "Image" : "File";
    newContent = newContent.replace(replace, ` [${fileType}] `);
  };

  execIterable(newContent, new RegExp(/!\[(.*?)\]\(.*\)/, "g"), execCallback);

  return newContent;
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
  return `${title}\n\n${getFilePrettyContent(content)}`;
};

export const getTaskCopyContent = (task: Task) => {
  let content = "";
  if (isChecklistModeTask(task)) {
    content = task.desc || "";
  } else {
    content = task.content || "";
  }
  const title = `${task.title || ""}`;
  return `${title}\n\n${content}`;
};
