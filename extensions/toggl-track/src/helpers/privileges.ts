import type { Workspace } from "@/api";

export const canModifyTagsIn = (workspace: Workspace) =>
  !workspace.only_admins_may_create_tags || workspace.role == "admin" || workspace.role == "projectlead";

export const canModifyProjectIn = (workspace: Workspace) =>
  !workspace.only_admins_may_create_projects || workspace.role == "admin" || workspace.role == "projectlead";
