import { existsSync } from "fs";
import { readFile } from "fs/promises";

import type { AppPreferences } from "../preferences";
import type { NormalizedProject, ProjectEntry } from "../types";
import { normalizeProject } from "./normalize-project";

export interface LoadProjectsResult {
  projects: NormalizedProject[];
  error?: string;
}

function isProjectEntryArray(value: unknown): value is ProjectEntry[] {
  return Array.isArray(value);
}

export async function loadProjects(
  projectsJsonPath: string,
  preferences: AppPreferences,
): Promise<LoadProjectsResult> {
  if (!existsSync(projectsJsonPath)) {
    return {
      projects: [],
      error: `projects.json was not found at ${projectsJsonPath}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(projectsJsonPath, "utf-8"));
  } catch (error) {
    return {
      projects: [],
      error: `Failed to parse projects.json: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!isProjectEntryArray(parsed)) {
    return {
      projects: [],
      error: "projects.json must be an array of Project Manager entries.",
    };
  }

  const projects = parsed
    .map((entry) => normalizeProject(entry, preferences))
    .filter((project): project is NormalizedProject => Boolean(project));

  return { projects };
}
