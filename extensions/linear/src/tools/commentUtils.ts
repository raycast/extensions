import type { Comment } from "@linear/sdk";

export async function serializeComment(comment: Comment) {
  const author = comment.user ? await comment.user : undefined;
  const agentSession = comment.agentSession ? await comment.agentSession : undefined;
  const onBehalfOf = agentSession?.creator ? await agentSession.creator : undefined;

  // Linear SDK models retain their request function as an enumerable property.
  // Tool results cross a structured-clone boundary, which rejects functions even
  // though JSON.stringify would silently omit them.
  return JSON.parse(
    JSON.stringify({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      editedAt: comment.editedAt,
      archivedAt: comment.archivedAt,
      url: comment.url,
      issueId: comment.issueId,
      projectId: comment.projectId,
      initiativeId: comment.initiativeId,
      documentContentId: comment.documentContentId,
      projectUpdateId: comment.projectUpdateId,
      initiativeUpdateId: comment.initiativeUpdateId,
      parentId: comment.parentId,
      quotedText: comment.quotedText,
      reactionData: comment.reactionData,
      reactions: comment.reactions,
      resolvedAt: comment.resolvedAt,
      resolvingCommentId: comment.resolvingCommentId,
      syncedWith: comment.syncedWith,
      botActor: comment.botActor,
      documentContent: comment.documentContent,
      externalThread: comment.externalThread,
      author,
      onBehalfOf,
    }),
  ) as Record<string, unknown>;
}
