import { newTab } from "../yab";

type Input = {
  /** An address, or words to search for. */
  query: string;
  /** The space to open it in: its id from get-spaces. Leave out for the space on screen. */
  spaceId?: string;
};

/** Open an address or a search in a new tab of Yab. */
export default async function tool(input: Input) {
  await newTab(input.query, input.spaceId);
  return "Opened";
}
