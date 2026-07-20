import { request } from "./request";
import { Task, CustomField } from "./tasks";

export type Section = {
  gid: string;
  name: string;
};

export type Project = {
  gid: string;
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  custom_field_settings: {
    gid: string;
    custom_field: CustomField;
  }[];
};

export async function getProjects(workspace: string) {
  const { data } = await request<{ data: Project[] }>(`/workspaces/${workspace}/typeahead`, {
    params: {
      workspace,
      resource_type: "project",
      opt_fields: "id,name,icon,color,custom_field_settings.custom_field",
    },
  });

  return data.data;
}

export async function addProject(taskId: string, projectId: string) {
  const payload = { project: projectId };
  const { data } = await request<{ data: Task }>(`/tasks/${taskId}/addProject`, {
    method: "POST",
    data: { data: payload },
  });

  return data.data;
}

export async function removeProject(taskId: string, projectId: string) {
  const payload = { project: projectId };
  const { data } = await request<{ data: Task }>(`/tasks/${taskId}/removeProject`, {
    method: "POST",
    data: { data: payload },
  });

  return data.data;
}

export async function getSections(projectId: string) {
  const { data } = await request<{ data: Section[] }>(`/projects/${projectId}/sections`, {
    params: {
      opt_fields: "name",
    },
  });

  return data.data;
}

export async function addTaskToSection(taskId: string, sectionId: string) {
  const payload = { task: taskId };
  const { data } = await request<{ data: Task }>(`/sections/${sectionId}/addTask`, {
    method: "POST",
    data: { data: payload },
  });

  return data.data;
}
