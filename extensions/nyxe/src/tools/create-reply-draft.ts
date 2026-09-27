import { nyxe } from "../lib/raycast";

type Input = {
  /**
   * The thread to reply in, exactly as returned by search-mail or list-inbox.
   */
  threadId: string;
  /**
   * The reply's body as plain text. Don't quote the earlier messages; Nyxe
   * threads the reply under them.
   */
  text: string;
  /**
   * Reply to everyone on the last message instead of just its sender.
   * Defaults to false.
   */
  replyAll?: boolean;
};

/**
 * Create a reply draft in a thread and return a link that opens it in Nyxe.
 * The draft is NOT sent: the user reviews and sends it themselves.
 */
export default async function tool(input: Input) {
  const draft = await nyxe().replyDraft(input.threadId, {
    text: input.text,
    replyAll: input.replyAll ?? false,
  });
  return { draftId: draft.draftId, threadId: draft.threadId, openUrl: draft.openUrl };
}
