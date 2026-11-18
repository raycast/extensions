import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Opaque continuation token returned by a preceding get-mentions call. Only pass it when the user explicitly asks for more. */
  nextToken?: string;
};

/** Get one page of posts that mention the authenticated X user. */
export default async function getMentions(input: Input) {
  return await clientV2.mentions(input.nextToken);
}
