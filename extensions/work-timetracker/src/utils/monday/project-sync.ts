import { readItem, writeItem } from "@utils/storage-helper";
import { mondayConfig } from "@monday/config";
import { mondayFetch } from "@monday/client";
import type { Project } from "@models";

// Re-export so other utils can still `import { Project } from "./utils/project-utils"`
export type { Project } from "@models";

/**
 * Fetches all non-archived groups from the configured Monday.com board and stores them in Raycast
 * LocalStorage so that they show up as regular projects inside the extension.
 *
 * If LocalStorage already contains projects the function will **not** overwrite them. This is done
 * to avoid surprising users that have manually created additional local projects. To force a
 * refresh simply clear the projects list from LocalStorage.
 *
 * @returns The up-to-date list of projects or an empty list when the Monday integration isn't
 *          configured.
 */
export async function seedProjectsFromMonday(skipCache = false): Promise<Project[]> {
  if (!mondayConfig.enabled) {
    return [];
  }

  const { boardId } = mondayConfig;
  if (!boardId) {
    console.warn("Monday.com integration is enabled but boardId is missing. Skipping project seed.");
    return [];
  }

  // See https://developer.monday.com/api-reference/docs/groups#query-groups for details
  const query = `
    query ($boardIds: [ID!]) {
      boards (ids: $boardIds) {
        groups {
          id
          title
          archived
        }
      }
    }
  `;

  const variables = { boardIds: [String(boardId)] };

  try {
    const json = await mondayFetch<{ boards: { groups: { id: string; title: string; archived: boolean }[] }[] }>(
      query,
      variables,
      { cache: !skipCache },
    );

    if (!json.data) {
      console.error("Failed to fetch groups from Monday", json.errors);
      return [];
    }

    const board = json.data.boards[0];
    const groups = board?.groups ?? [];

    const mondayProjects: Project[] = groups
      .filter((g) => !g.archived)
      .map((g) => ({ id: g.id, name: g.title, mondayGroupId: g.id }));

    // Merge with any existing local projects (keep user-defined ones intact)
    const existing = await readItem("projects");

    const merged: Project[] = [...existing];
    for (const mp of mondayProjects) {
      const already = merged.find((p) => p.id === mp.id);
      if (!already) {
        merged.push(mp);
      }
    }

    await writeItem("projects", merged);

    return merged;
  } catch (error) {
    console.error("Could not seed projects from Monday", error);
    return [];
  }
}
