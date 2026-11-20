import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** DM conversation ID returned by get-dm-conversations. Pass either this or username, not both. */
  conversationId?: string;
  /** Exact username of the other person in a one-to-one conversation, with or without the leading @. Pass either this or conversationId, not both. */
  username?: string;
  /** Opaque continuation token returned by a preceding get-dm-messages call for the same conversation. Only pass it when the user explicitly asks for more. */
  nextToken?: string;
};

/** Get one page of messages from a single direct message conversation, newest first. */
export default async function getDmMessages(input: Input) {
  return await clientV2.directMessages(
    { conversationId: input.conversationId, username: input.username },
    input.nextToken,
  );
}
