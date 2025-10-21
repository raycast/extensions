import { request } from "./request";
import { Project } from "./projects";

type UserTaskList = {
  gid: string;
};

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
};

const taskFields =
  "id,name,due_on,due_at,start_on,completed,projects.name,projects.color,assignee_section.name,permalink_url,custom_fields,assignee.name,memberships.project.name,memberships.section.name,tags.name";

export async function getMyTasks(workspace: string, showCompletedTasks: boolean) {
  const {
    data: {
      data: { gid: userTaskListId },
    },
  } = await request<{ data: UserTaskList }>("/users/me/user_task_list", {
    params: {
      workspace,
    },
  });

  const {
    data: { data },
  } = await request<{ data: Task[] }>(`/user_task_lists/${userTaskListId}/tasks`, {
    params: {
      opt_fields: taskFields,
      ...(showCompletedTasks ? {} : { completed_since: "now" }),
    },
  });

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
