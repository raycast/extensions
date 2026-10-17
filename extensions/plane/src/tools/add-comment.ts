import { Tool } from "@raycast/api";
import { fetchWorkItem } from "../api/ai";
import { addWorkItemComment } from "../api/comments";
import { getWorkItemUrlWithIdentifier } from "../helpers/work-items";
import { requirePlaneClient } from "../api/auth";
import { withPlane } from "../helpers/with-plane";

type Input = {
  /** Work item identifier such as ENG-123, or a Plane work item URL. */
  identifier: string;
  /** Comment text in Markdown. */
  comment: string;
};

export default withPlane(async (input: Input) => {
  const { raw, project } = await fetchWorkItem(input.identifier);
  const comment = await addWorkItemComment({ projectId: project.id, workItemId: raw.id, markdown: input.comment });
  const identifier = `${project.identifier}-${raw.sequence_id}`;
  return {
    id: comment.id,
    workItem: identifier,
    url: getWorkItemUrlWithIdentifier(requirePlaneClient().workspaceSlug, identifier),
  };
});

export const confirmation: Tool.Confirmation<Input> = withPlane(async (input: Input) => {
  const { raw, project } = await fetchWorkItem(input.identifier);
  return {
    message: `Add a comment to ${project.identifier}-${raw.sequence_id}: ${raw.name}?`,
    info: [{ name: "Comment", value: input.comment.slice(0, 500) }],
  };
});
