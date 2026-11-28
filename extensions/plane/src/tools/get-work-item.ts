import { fetchWorkItem, serializeWorkItem } from "../api/ai";
import { getWorkItemComments } from "../api/comments";
import { parseHtmlToMarkdown } from "../helpers/parser";
import { withPlane } from "../helpers/with-plane";

type Input = {
  /** Work item identifier such as ENG-123, or a Plane work item URL. */
  identifier: string;
  /** Include the latest comments (default true). */
  includeComments?: boolean;
};

export default withPlane(async (input: Input) => {
  const { raw, project } = await fetchWorkItem(input.identifier);
  const workItem = serializeWorkItem(raw, project, { includeDescription: true });
  if (input.includeComments === false) return workItem;

  const { comments, total } = await getWorkItemComments({ projectId: project.id, workItemId: raw.id, perPage: 5 });
  return {
    ...workItem,
    commentCount: total,
    latestComments: comments.map((comment) => ({
      author:
        comment.actor && typeof comment.actor === "object"
          ? comment.actor.display_name || comment.actor.email || comment.actor.id
          : undefined,
      createdAt: comment.created_at,
      body: parseHtmlToMarkdown(comment.comment_html ?? "").slice(0, 2000),
    })),
  };
});
