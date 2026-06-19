import { getRemoteConfigTemplate } from "./remote-config-client";
import type { ProjectConfig, ProjectSnapshot } from "./types";

export async function loadProjectSnapshots(
  projects: ProjectConfig[],
): Promise<ProjectSnapshot[]> {
  const results = await Promise.allSettled(
    projects.map(async (project) => {
      const { template, etag } = await getRemoteConfigTemplate(project);
      return {
        project,
        template,
        etag,
        fetchedAt: new Date().toISOString(),
      } satisfies ProjectSnapshot;
    }),
  );

  const snapshots = results
    .filter(
      (result): result is PromiseFulfilledResult<ProjectSnapshot> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  return snapshots.sort((left, right) =>
    left.project.displayName.localeCompare(right.project.displayName),
  );
}
