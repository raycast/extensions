import { LinearClient, PaginationOrderBy } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { IssueField, resolveWorkflowState, serializeIssue } from "./issueUtils";
import {
  afterDate,
  client,
  collect,
  PageInput,
  resolveCycle,
  resolveIssue,
  resolveIssueLabel,
  resolveProject,
  resolveRelease,
  resolveTeam,
  resolveUser,
} from "./linearUtils";

type IssueFilter = NonNullable<Parameters<LinearClient["issues"]>[0]>["filter"];

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  query?: string;
  team?: string;
  state?: string;
  cycle?: string;
  label?: string;
  /** User ID, name, email, me, or the literal string null for unassigned issues. */
  assignee?: string;
  delegate?: string;
  project?: string;
  release?: string;
  priority?: number;
  parentId?: string;
  fields?: IssueField[];
  createdAt?: string;
  updatedAt?: string;
  includeArchived?: boolean;
}

export default withAccessToken(linear)(async (input: Input) => {
  const team = input.team ? await resolveTeam(input.team) : undefined;
  const state = input.state ? await resolveState(input.state, team?.id) : undefined;
  const cycle = input.cycle ? await resolveCycle(input.cycle, team?.id) : undefined;
  const label = input.label ? await resolveIssueLabel(input.label) : undefined;
  const assignee =
    input.assignee && input.assignee.toLowerCase() !== "null" ? await resolveUser(input.assignee) : undefined;
  const delegate = input.delegate ? await resolveUser(input.delegate) : undefined;
  const project = input.project ? await resolveProject(input.project) : undefined;
  const release = input.release ? await resolveRelease(input.release) : undefined;
  const parent = input.parentId ? await resolveIssue(input.parentId) : undefined;
  const createdAfter = afterDate(input.createdAt);
  const updatedAfter = afterDate(input.updatedAt);
  const filter: IssueFilter = {
    team: team ? { id: { eq: team.id } } : undefined,
    state: state ? { id: { eq: state.id } } : undefined,
    cycle: cycle ? { id: { eq: cycle.id } } : undefined,
    labels: label ? { some: { id: { eq: label.id } } } : undefined,
    assignee:
      input.assignee?.toLowerCase() === "null" ? { null: true } : assignee ? { id: { eq: assignee.id } } : undefined,
    delegate: delegate ? { id: { eq: delegate.id } } : undefined,
    project: project ? { id: { eq: project.id } } : undefined,
    releases: release ? { some: { id: { eq: release.id } } } : undefined,
    priority: input.priority === undefined ? undefined : { eq: input.priority },
    parent: parent ? { id: { eq: parent.id } } : undefined,
    createdAt: createdAfter ? { gte: createdAfter } : undefined,
    updatedAt: updatedAfter ? { gte: updatedAfter } : undefined,
    or: input.query
      ? [{ title: { containsIgnoreCase: input.query } }, { description: { containsIgnoreCase: input.query } }]
      : undefined,
  };
  const result = await collect(
    ({ first, after }) =>
      client().issues({
        first,
        after,
        filter,
        includeArchived: input.includeArchived,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    input,
  );
  return { ...result, nodes: await Promise.all(result.nodes.map((issue) => serializeIssue(issue, input.fields))) };
});

async function resolveState(query: string, teamId?: string) {
  if (teamId) return resolveWorkflowState(query, teamId);
  try {
    return await client().workflowState(query);
  } catch {
    // Resolve human-readable state names and types below.
  }
  const normalized = query.toLowerCase();
  const states = (await client().workflowStates({ first: 250 })).nodes;
  const matches = states.filter((state) => state.name.toLowerCase() === normalized || state.type === normalized);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Multiple issue statuses match "${query}". Pass a team or status ID.`);
  throw new Error(`No issue status found for "${query}".`);
}
