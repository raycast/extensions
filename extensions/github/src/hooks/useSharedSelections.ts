import { getPreferenceValues } from "@raycast/api";
import { SetStateAction } from "react";
import { useEffect } from "react";

import {
  getLastAssignees,
  getLastProjects,
  getLastRepository,
  setLastAssignees,
  setLastProjects,
  setLastRepository,
} from "../helpers/selections";

// Base type definition (with ID)
interface HasId {
  id: string;
  [key: string]: unknown;
}

/**
 * A custom hook to share selections (repository, assignee, project) across commands
 *
 * @param values Current form values
 * @param setValue Function to update form values
 * @param collaborators List of repository collaborators
 * @param projects List of repository projects
 * @returns void
 */
export function useSharedSelections<T extends { repository: string; assignees?: string[]; projects?: string[] }>(
  values: T,
  setValue: <K extends keyof T>(key: K, value: SetStateAction<T[K]>) => void,
  { collaborators, projects }: { collaborators?: (HasId | null)[] | null; projects?: (HasId | null)[] | null }
) {
  const globalPreferences = getPreferenceValues();
  const hasAssignees = "assignees" in values;
  const hasProjects = "projects" in values;

  // Save repository when changed
  useEffect(() => {
    if (values.repository && globalPreferences.retainLastRepository) {
      setLastRepository(values.repository).catch(console.error);
    }
  }, [values.repository, globalPreferences.retainLastRepository]);

  // Save assignee when changed
  useEffect(() => {
    if (hasAssignees && values.assignees && values.assignees.length > 0 && globalPreferences.retainLastAssignee) {
      setLastAssignees(values.assignees).catch(console.error);
    }
  }, [values.assignees, globalPreferences.retainLastAssignee, hasAssignees]);

  // Save project when changed
  useEffect(() => {
    if (hasProjects && values.projects && values.projects.length > 0 && globalPreferences.retainLastProject) {
      setLastProjects(values.projects).catch(console.error);
    }
  }, [values.projects, globalPreferences.retainLastProject, hasProjects]);

  // Load initial value (repository)
  useEffect(() => {
    async function loadLastRepository() {
      if (globalPreferences.retainLastRepository && !values.repository) {
        const lastRepo = await getLastRepository();
        if (lastRepo) {
          setValue("repository", lastRepo);
        }
      }
    }
    loadLastRepository();
  }, []);

  // Load initial values (assignee, project)
  useEffect(() => {
    async function loadLastAssigneeAndProject() {
      if (!values.repository) return;

      if (hasAssignees && globalPreferences.retainLastAssignee && collaborators?.length) {
        const lastAssignees = await getLastAssignees();
        if (lastAssignees && lastAssignees.length > 0) {
          // Filter to only include assignees that are still in the collaborators list
          const validAssignees = lastAssignees.filter(id => collaborators.some(c => c?.id === id));
          if (validAssignees.length > 0) {
            setValue("assignees", validAssignees as SetStateAction<T["assignees"]>);
          }
        }
      }

      if (hasProjects && globalPreferences.retainLastProject && projects?.length) {
        const lastProjects = await getLastProjects();
        if (lastProjects && lastProjects.length > 0) {
          // Filter to only include projects that are still in the projects list
          const validProjects = lastProjects.filter(id => projects.some(p => p?.id === id));
          if (validProjects.length > 0) {
            setValue("projects", validProjects as SetStateAction<T["projects"]>);
          }
        }
      }
    }
    loadLastAssigneeAndProject();
  }, [collaborators, projects, hasAssignees, hasProjects, globalPreferences.retainLastAssignee, globalPreferences.retainLastProject]);
}
