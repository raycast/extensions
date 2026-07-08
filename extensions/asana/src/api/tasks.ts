import { request } from "./request";
import { Project } from "./projects";

type AssigneeSection = {
  gid: string;
  name: string;
};

type Section = {
  gid: string;
  name: string;
};

type Membership = {
  project: Project;
  section: Section | null;
};

type Assignee = {
  gid: string;
  name: string;
};

export type EnumValue = {
  gid: string;
  color: string;
  name: string;
};

export type CustomField = {
  gid: string;
  enum_value?: EnumValue;
  enum_options?: EnumValue[];
  display_value: string;
  name: string;
  resource_subtype: string;
};

type Tag = {
  gid: string;
  name: string;
};

type Parent = {
  gid: string;
  name: string;
};

export type Task = {
  gid: string;
  id: string;
  name: string;
  due_at: string | null;
  due_on: string | null;
  start_on: string | null;
  completed: boolean;
  permalink_url: string;
  projects: Project[];
  assignee_section: AssigneeSection;
  assignee: Assignee | null;
  custom_fields: CustomField[];
  memberships: Membership[];
  tags: Tag[];
  parent: Parent | null;
};

const taskFields =
  "id,name,due_on,due_at,start_on,completed,projects.name,projects.color,assignee_section.name,permalink_url,custom_fields,assignee.name,memberships.project.name,memberships.section.name,tags.name,parent.name";

// Number of days around today used for the default (unsearched) My Tasks view.
const MY_TASKS_DUE_WINDOW_DAYS = 3;
// Hard cap on how many tasks a single My Tasks request loads. The full user
// task list can be huge (years of overdue tasks) and loading all of it at once
// blows Raycast's per-command memory limit, so we always bound the result.
const MY_TASKS_LIMIT = 100;

// Local (not UTC) `YYYY-MM-DD` so the due-date window matches the user's day.
function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getMyTasks(workspace: string, showCompletedTasks: boolean, query?: string) {
  const trimmedQuery = query?.trim();

  // Use Asana's search endpoint so the workspace does the filtering, sorting and
  // limiting server-side. Fetching the whole `/user_task_lists/{id}/tasks` list
  // returns a 400 ("result is too large") and, once paginated, overflows the
  // command's memory in large workspaces.
  const params: Record<string, string | number | boolean> = {
    "assignee.any": "me",
    opt_fields: taskFields,
    sort_by: "due_date",
    sort_ascending: false,
    limit: MY_TASKS_LIMIT,
  };

  if (!showCompletedTasks) {
    params.completed = false;
  }

  if (trimmedQuery) {
    // While searching, drop the default date window and look across all tasks.
    params.text = trimmedQuery;
  } else {
    // Default view: only tasks due within a few days of today (up to
    // MY_TASKS_DUE_WINDOW_DAYS overdue through the same many days ahead).
    const after = new Date();
    after.setDate(after.getDate() - MY_TASKS_DUE_WINDOW_DAYS);
    const before = new Date();
    before.setDate(before.getDate() + MY_TASKS_DUE_WINDOW_DAYS);
    params["due_on.after"] = toLocalDateString(after);
    params["due_on.before"] = toLocalDateString(before);
  }

  const {
    data: { data },
  } = await request<{ data: Task[] }>(`/workspaces/${workspace}/tasks/search`, { params });

  return data;
}

export type TaskDetail = Task & { html_notes: string };

export async function getTask(taskId: string) {
  const { data } = await request<{ data: TaskDetail }>(`/tasks/${taskId}`, {
    params: {
      opt_fields: `${taskFields},html_notes`,
    },
  });

  return data.data;
}

export type TaskPayload = {
  workspace: string;
} & Partial<{
  name: string;
  projects: string[];
  description: string;
  due_on: string;
  start_on: string;
  assignee: string;
  custom_fields: Record<string, string>;
  html_notes: string;
  memberships: { project: string; section?: string }[];
  tags: string[];
}>;

export async function createTask(payload: TaskPayload) {
  const { data } = await request<{ data: Task }>("/tasks", {
    method: "POST",
    data: { data: payload },
  });

  return data.data;
}

type UpdateTaskPayload = Partial<{
  completed: boolean;
  assignee: string | null;
  due_on: Date | null;
  custom_fields: Record<string, string | null>;
  name: string;
}>;

export async function updateTask(taskId: string, payload: UpdateTaskPayload) {
  const { data } = await request<{ data: Task }>(`/tasks/${taskId}`, {
    method: "PUT",
    data: { data: payload },
  });

  return data.data;
}

export async function deleteTask(taskId: string) {
  await request<{ data: Task }>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}

const subtaskFields =
  "gid,name,due_on,due_at,start_on,completed,projects.name,projects.color,assignee_section.name,permalink_url,custom_fields,assignee.name,memberships.project.name,memberships.section.name,tags.name,parent.name";

export async function getSubtasks(taskId: string) {
  const { data } = await request<{ data: Task[] }>(`/tasks/${taskId}/subtasks`, {
    params: {
      opt_fields: subtaskFields,
    },
  });

  return data.data;
}

export async function setTaskParent(taskId: string, parentId: string) {
  const { data } = await request<{ data: Task }>(`/tasks/${taskId}/setParent`, {
    method: "POST",
    data: { data: { parent: parentId } },
  });
  return data.data;
}

export async function removeTaskParent(taskId: string) {
  const { data } = await request<{ data: Task }>(`/tasks/${taskId}/setParent`, {
    method: "POST",
    data: { data: { parent: null } },
  });
  return data.data;
}

export async function searchTasks(workspace: string, query?: string) {
  const { data } = await request<{ data: Pick<Task, "gid" | "name" | "parent">[] }>(
    `/workspaces/${workspace}/typeahead`,
    {
      params: {
        resource_type: "task",
        query: query || "",
        opt_fields: "gid,name,parent",
      },
    },
  );
  // Only return top-level tasks (not subtasks)
  return data.data.filter((task) => !task.parent);
}

export type SubtaskPayload = {
  name: string;
  assignee?: string;
  due_on?: string;
  html_notes?: string;
  memberships?: { project: string; section?: string }[];
};

export async function createSubtask(parentId: string, payload: SubtaskPayload) {
  const { data } = await request<{ data: Task }>(`/tasks/${parentId}/subtasks`, {
    method: "POST",
    data: { data: payload },
  });
  return data.data;
}
