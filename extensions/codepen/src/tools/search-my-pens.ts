import { getClient } from "../lib/api";

type Input = {
  /** Search your titles and descriptions. Supports quoted phrases and -excluded words. Max 200 characters. */
  search?: string;
  filter?: "all" | "V2" | "Classic" | "templates" | "deployed" | "Public" | "Private" | "Protected" | "Collaborators";
  /** Exact next URL from the previous result; omit for the first page or a new search. */
  next?: string;
};
/**
 * This searches only the authenticated owner's work, including when filter is Public.
 * If asked for other people's Pens, public community search, or trending work, explain that
 * the API does not support that request and do not call this tool.
 */
export default function tool(input: Input) {
  return getClient().listPens(input, input.next);
}
