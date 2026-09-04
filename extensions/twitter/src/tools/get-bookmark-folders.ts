import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Optional numeric bookmark folder ID whose posts should be returned. Omit to list folders. */
  folderId?: string;
  /** Opaque continuation token returned by a preceding call. Only pass it when the user explicitly asks for more. */
  nextToken?: string;
};

/** List bookmark folders or get one page of posts from a specific folder. */
export default async function getBookmarkFolders(input: Input) {
  if (input.folderId) return await clientV2.bookmarksInFolder(input.folderId, input.nextToken);
  return await clientV2.bookmarkFolders(input.nextToken);
}
