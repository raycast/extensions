import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Opaque continuation token returned by a preceding get-timeline call. Only pass it when the user explicitly asks for more results. */
  nextToken?: string;
};

/** Get one page of posts from the authenticated user's X home timeline. */
export default async function getTimeline(input: Input) {
  return await clientV2.homeTimeline(input.nextToken);
}
