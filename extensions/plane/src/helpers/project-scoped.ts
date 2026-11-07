/**
 * Rows tagged with the project whose request produced them. With `keepPreviousData`, a list keeps the previous
 * project's rows while the newly selected project loads; their actions would then run against the new project.
 * Lists tag rows when fetching and render only the rows of the selected project.
 */
export type FromProject<T> = T & { sourceProjectId: string };

/** Tags rows with `projectId` ("" for workspace-level rows). */
export function tagWithProject<T extends object>(rows: T[], projectId: string): FromProject<T>[] {
  return rows.map((row) => ({ ...row, sourceProjectId: projectId }));
}

/** Only the rows fetched for `projectId`; none while no project is selected. */
export function rowsFromProject<T extends { sourceProjectId?: string }>(
  rows: T[] | undefined,
  projectId: string | undefined,
): T[] {
  if (projectId === undefined) return [];
  return (rows ?? []).filter((row) => row.sourceProjectId === projectId);
}
