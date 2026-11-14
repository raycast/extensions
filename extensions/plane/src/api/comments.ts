import { IssueComment } from "@makeplane/plane-node-sdk";
import { requirePlaneClient } from "./auth";
import { planeRequest, workspacePath } from "./request";
import type { RawComment, RawPaginated } from "./types";
import { parseMarkdownToHtml } from "../helpers/parser";

/** Latest comments first (the v1 endpoint orders by `-created_at`). */
export async function getWorkItemComments({
  projectId,
  workItemId,
  perPage = 10,
}: {
  projectId: string;
  workItemId: string;
  perPage?: number;
}): Promise<{ comments: RawComment[]; total: number }> {
  const response = await planeRequest<RawPaginated<RawComment>>(
    workspacePath("projects", projectId, "work-items", workItemId, "comments"),
    { query: { per_page: perPage, expand: "actor" } },
  );
  const comments = response.results ?? [];
  return { comments, total: response.total_count ?? response.total_results ?? comments.length };
}

/** Adds a comment. `markdown` is converted to HTML because Plane stores `comment_html`. */
export async function addWorkItemComment({
  projectId,
  workItemId,
  markdown,
}: {
  projectId: string;
  workItemId: string;
  markdown: string;
}): Promise<IssueComment> {
  const client = requirePlaneClient();
  const commentHtml = await parseMarkdownToHtml(markdown);
  return client.workItemCommentsApi.createWorkItemComment({
    slug: client.workspaceSlug,
    projectId,
    issueId: workItemId,
    issueCommentCreateRequest: { commentHtml },
  });
}
