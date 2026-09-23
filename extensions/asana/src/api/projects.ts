import { getPreferenceValues } from "@raycast/api";
import { request, requestAll } from "./request";
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
  archived?: boolean;
  custom_field_settings: {
    gid: string;
    custom_field: CustomField;
  }[];
};

export async function getProjects(workspace: string) {
  const { showArchivedProjects } = getPreferenceValues<Preferences>();

  // Use the `/projects` listing endpoint (paginated) instead of `/typeahead`.
  // Typeahead without a query only returns a small set of recently accessed
  // projects, so most of the workspace's projects were missing from the picker.
  return requestAll<Project>("/projects", {
    params: {
      workspace,
      // Omitting `archived` returns both active and archived projects.
      ...(showArchivedProjects ? {} : { archived: false }),
      opt_fields: "id,name,icon,color,archived,custom_field_settings.custom_field",
    },
  });
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
