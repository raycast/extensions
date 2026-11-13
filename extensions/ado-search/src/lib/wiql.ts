/**
 * Pure WIQL (Work Item Query Language) builder for the "My Work Items" command.
 * No I/O, no Raycast deps — kept side-effect free so the query shape can be
 * reasoned about (and typechecked via `npm run build`) in isolation.
 */

export interface WorkItemsWiqlOptions {
  /** Filter to a single project. Empty/undefined = org-wide. */
  project?: string;
  /** Filter to specific states. Empty/undefined = all except Closed/Removed/Done. */
  states?: string[];
  /** Filter to specific work item types. Empty/undefined = all types. */
  types?: string[];
  /**
   * Restrict to items assigned to the current user. Defaults to true.
   * When false, a bounding filter (project/states/types) is required to avoid
   * pulling the entire organization's backlog.
   */
  assignedToMe?: boolean;
}

function quoteList(values: string[]): string {
  return values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
}

/** Build the WIQL query string that selects work item IDs. */
export function buildWorkItemsWiql(options: WorkItemsWiqlOptions): string {
  const project = options.project?.trim() || undefined;
  const states = options.states ?? [];
  const types = options.types ?? [];
  const assignedToMe = options.assignedToMe !== false; // default true

  // Volume guard: an unassigned, unfiltered query could return the whole org.
  if (!assignedToMe && !project && states.length === 0 && types.length === 0) {
    throw new Error("When not filtering by assigned-to-me, set a bounding filter (project, state, or type).");
  }

  const predicates: string[] = [];
  if (assignedToMe) predicates.push("[System.AssignedTo] = @Me");
  predicates.push(
    states.length ? `[System.State] IN (${quoteList(states)})` : `[System.State] NOT IN ('Closed', 'Removed', 'Done')`,
  );
  if (types.length) predicates.push(`[System.WorkItemType] IN (${quoteList(types)})`);
  if (project) predicates.push(`[System.TeamProject] = '${project.replace(/'/g, "''")}'`);

  return `
      SELECT [System.Id]
      FROM WorkItems
      WHERE ${predicates.join(" AND ")}
      ORDER BY [System.ChangedDate] DESC
    `;
}
