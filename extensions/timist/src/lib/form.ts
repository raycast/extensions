// Shared project/tag form-value handling for Start Timer and Create New
// Context. Known picks send IDs; free text sends names (created or resolved
// server-side).

export const NEW_PROJECT_VALUE = "__new-project__";

export interface ProjectTagFormValues {
  project: string;
  newProjectName?: string;
  tagIds: string[];
  newTagNames?: string;
}

export interface ProjectTagParams {
  project_id?: string;
  project_name?: string;
  tag_ids?: string[];
  tag_names?: string[];
}

export function projectTagParams(values: ProjectTagFormValues): ProjectTagParams {
  const params: ProjectTagParams = {};
  if (values.project === NEW_PROJECT_VALUE) {
    const name = values.newProjectName?.trim();
    if (name) params.project_name = name;
  } else if (values.project) {
    params.project_id = values.project;
  }
  if (values.tagIds?.length) params.tag_ids = values.tagIds;
  const names = (values.newTagNames ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length > 0) params.tag_names = names;
  return params;
}
