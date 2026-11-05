import * as E from "fp-ts/Either";
import { withAppleMusicAuth } from "../util/apple-music-auth";
import { searchCatalog } from "../util/catalog-api";

type Input = {
  /** Song title and/or artist to search in the Apple Music catalog, not just the library. */
  query: string;
};

export default withAppleMusicAuth(async function search(input: Input) {
  if (!input.query.trim()) throw new Error("Enter a song title or artist.");
  const result = await searchCatalog(input.query.trim())();
  if (E.isLeft(result)) throw result.left;
  return result.right;
});
