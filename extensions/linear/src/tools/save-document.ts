import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import {
  applyPatch,
  client,
  ContentPatch,
  resolveCycle,
  resolveDocument,
  resolveInitiative,
  resolveIssue,
  resolveProject,
  resolveTeam,
} from "./linearUtils";

type Input = {
  id?: string;
  title?: string;
  content?: string;
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
  project?: string;
  issue?: string;
  initiative?: string;
  cycle?: string;
  team?: string;
  icon?: string;
  color?: string;
};

export default withAccessToken(linear)(async (input: Input) => {
  if (input.content !== undefined && input.patch) throw new Error("Pass content or patch, not both.");
  const parentCount = [input.project, input.issue, input.initiative, input.cycle, input.team && !input.cycle].filter(
    Boolean,
  ).length;
  if (!input.id && parentCount !== 1) throw new Error("New documents require exactly one parent.");
  const document = input.id ? await resolveDocument(input.id) : undefined;
  const content = input.patch ? applyPatch(document?.content ?? "", input.patch as ContentPatch[]) : input.content;
  const parent = {
    projectId: input.project ? (await resolveProject(input.project)).id : undefined,
    issueId: input.issue ? (await resolveIssue(input.issue)).id : undefined,
    initiativeId: input.initiative ? (await resolveInitiative(input.initiative)).id : undefined,
    cycleId: input.cycle ? (await resolveCycle(input.cycle, input.team)).id : undefined,
    teamId: input.team && !input.cycle ? (await resolveTeam(input.team)).id : undefined,
  };
  if (document) {
    const result = await client().updateDocument(document.id, {
      title: input.title,
      content,
      icon: input.icon,
      color: input.color,
      ...parent,
    });
    if (!result.success) throw new Error("Failed to update document.");
    return result.document;
  }
  if (!input.title) throw new Error("title is required when creating a document.");
  const result = await client().createDocument({
    title: input.title,
    content,
    icon: input.icon,
    color: input.color,
    ...parent,
  });
  if (!result.success) throw new Error("Failed to create document.");
  return result.document;
});
