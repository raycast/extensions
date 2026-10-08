import { LinearClient, PaginationOrderBy } from "@linear/sdk";

import { resolveWorkflowState } from "./issueUtils";
import {
  afterDate,
  client,
  collect,
  isUuid,
  PageInput,
  resolveCycle,
  resolveIssue,
  resolveIssueLabel,
  resolveProject,
  resolveRelease,
  resolveTeam,
  resolveUser,
} from "./linearUtils";
import { IssueField, serializeIssue } from "./serializers";
import { withLinear } from "./withLinear";

type IssueFilter = NonNullable<Parameters<LinearClient["issues"]>[0]>["filter"];

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  query?: string;
  team?: string;
  /** Status ID, name, or type. Without `team`, matches that status in every team. */
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

export default withLinear(async (input: Input) => {
  const team = input.team ? await resolveTeam(input.team) : undefined;
  const state = input.state && team ? await resolveWorkflowState(input.state, team.id) : undefined;
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
    state: state ? { id: { eq: state.id } } : input.state ? stateAcrossTeams(input.state) : undefined,
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

/**
 * Matches a status by ID, name, or type across all teams.
 *
 * Every team has its own workflow states, so a name like "In Progress" exists once per team. Resolving it to a single state would fail for questions like "my in-progress issues", so without a team the filter matches every team's state of that name instead.
 */
function stateAcrossTeams(query: string): NonNullable<IssueFilter>["state"] {
  if (isUuid(query)) return { id: { eq: query } };
  return { or: [{ name: { eqIgnoreCase: query } }, { type: { eq: query.toLowerCase() } }] };
}
