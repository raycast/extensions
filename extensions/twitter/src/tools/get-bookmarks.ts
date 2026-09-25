import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Opaque continuation token returned by a preceding get-bookmarks call. Only pass it when the user explicitly asks for more results. */
  nextToken?: string;
};

/** Get one page of posts bookmarked by the authenticated X user. */
export default async function getBookmarks(input: Input) {
  return await clientV2.bookmarks(input.nextToken);
}
