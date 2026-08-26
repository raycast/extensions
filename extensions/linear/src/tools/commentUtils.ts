import { Comment } from "@linear/sdk";

export async function serializeComment(comment: Comment) {
  const author = comment.user ? await comment.user : undefined;
  const agentSession = comment.agentSession ? await comment.agentSession : undefined;
  const onBehalfOf = agentSession?.creator ? await agentSession.creator : undefined;
  return {
    ...comment,
    author,
    onBehalfOf,
  };
}
