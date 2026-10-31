import { resolve } from "../data";
import { newWindow } from "../yab";

type Input = {
  /** An address or words to open in it. Leave out for an empty window. */
  query?: string;
  /** The space the window shows: its id from get-spaces. */
  spaceId?: string;
};

/** Open a new Yab window. */
export default async function tool(input: Input) {
  await newWindow({ url: input.query ? await resolve(input.query, input.spaceId) : undefined, spaceId: input.spaceId });
  return "Opened";
}
