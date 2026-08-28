import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { issueInput, IssueUpdateInput, serializeIssue, setIssueRelations, setIssueReleases } from "./issueUtils";
import { applyPatch, client, ContentPatch, resolveIssue } from "./linearUtils";

type Input = {
  id?: string;
  title?: string;
  description?: string;
  patch?: {
    op: "replace" | "insert_before" | "insert_after" | "prepend" | "append" | "replace_range";
    old_string?: string;
    new_string?: string;
    replace_all?: boolean;
    anchor?: string;
    text?: string;
    from?: string;
    to?: string;
  }[];
  team?: string;
  /** Cycle name, number, ID, or the literal string null to remove it. */
  cycle?: string;
  milestone?: string;
  priority?: number;
  /** Project name, ID, identifier, slug, or the literal string null to remove it. */
  project?: string;
  state?: string;
  /** User ID, name, email, me, or the literal string null to unassign. */
  assignee?: string;
  /** Agent name, ID, or the literal string null to remove delegation. */
  delegate?: string;
  labels?: string[];
  /** Due date, or the literal string null to remove it. */
  dueDate?: string;
  /** SLA breach timestamp, or the literal string null to remove it. */
  slaBreachesAt?: string;
  /** SLA day counting type, or unset to leave unchanged. Use "null" with slaBreachesAt to remove the SLA. */
  slaType?: "all" | "onlyBusinessDays";
  /** Parent issue ID, identifier, or the literal string null to remove it. */
  parentId?: string;
  /** Estimate. Use -1 to clear an existing estimate. */
  estimate?: number;
  links?: { url: string; title: string }[];
  setReleases?: string[];
  addReleases?: string[];
  removeReleases?: string[];
  blocks?: string[];
  blockedBy?: string[];
  relatedTo?: string[];
  /** Issue ID/identifier, or the literal string null to remove the duplicate relation. */
  duplicateOf?: string;
  removeBlocks?: string[];
  removeBlockedBy?: string[];
  removeRelatedTo?: string[];
};

export default withAccessToken(linear)(async (input: Input) => {
  if (input.description !== undefined && input.patch) throw new Error("Pass description or patch, not both.");
  const existing = input.id ? await resolveIssue(input.id) : undefined;
  if (!existing && (!input.title || !input.team))
    throw new Error("title and team are required when creating an issue.");
  const description = input.patch
    ? applyPatch(existing?.description ?? "", input.patch as ContentPatch[])
    : input.description;
  const nullable = (value?: string) => (value === "null" ? null : value);
  const resolved = await issueInput({
    ...input,
    description,
    cycle: nullable(input.cycle),
    project: nullable(input.project),
    assignee: nullable(input.assignee),
    delegate: nullable(input.delegate),
    dueDate: nullable(input.dueDate),
    slaBreachesAt: nullable(input.slaBreachesAt),
    slaType: input.slaBreachesAt === "null" ? null : input.slaType,
    parentId: nullable(input.parentId),
    estimate: input.estimate === -1 ? null : input.estimate,
  });
  let issue;
  if (existing) {
    const result = await client().updateIssue(existing.id, resolved as IssueUpdateInput);
    if (!result.success || !result.issue) throw new Error("Failed to update issue.");
    issue = await result.issue;
  } else {
    const result = await client().createIssue({
      ...resolved,
      slaBreachesAt: resolved.slaBreachesAt ?? undefined,
      title: input.title!,
      teamId: resolved.teamId!,
    });
    if (!result.success || !result.issue) throw new Error("Failed to create issue.");
    issue = await result.issue;
  }

  for (const link of input.links ?? []) {
    const result = await client().createAttachment({ issueId: issue.id, url: link.url, title: link.title });
    if (!result.success || !result.attachment) throw new Error("Failed to create issue link.");
  }
  await setIssueReleases(issue, input);
  await setIssueRelations(
    issue,
    { ...input, duplicateOf: input.duplicateOf === "null" ? null : input.duplicateOf },
    input,
  );
  return serializeIssue(issue);
});
