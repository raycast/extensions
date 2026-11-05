import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Opaque continuation token returned by a preceding get-dm-conversations call. Only pass it when the user explicitly asks for more. */
  nextToken?: string;
};

/** Get one page of the authenticated user's recent direct message events, grouped into conversations with participant profiles. */
export default async function getDmConversations(input: Input) {
  return await clientV2.directMessageConversations(input.nextToken);
}
