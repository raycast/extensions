import { getClient } from "../lib/api";
type Input = {
  /** Omit to list collections. Provide a collection ID to list your Pens in it. */
  collectionId?: string;
  /** Exact next URL from the previous result. */
  next?: string;
};
export default function tool(input: Input) {
  return input.collectionId
    ? getClient().listCollectionPens(input.collectionId, input.next)
    : getClient().listCollections(input.next);
}
