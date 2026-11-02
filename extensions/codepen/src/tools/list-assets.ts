import { getClient } from "../lib/api";
type Input = { /** Exact next URL from the previous result. Omit for the first page. */ next?: string };
export default function tool(input: Input) {
  return getClient().listAssets(input.next);
}
