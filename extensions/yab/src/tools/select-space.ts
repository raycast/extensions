import { focusSpace } from "../yab";

type Input = {
  /** The space's id, from get-spaces. */
  spaceId: string;
};

/** Go to a space in Yab's front window. */
export default async function tool(input: Input) {
  await focusSpace(input.spaceId);
  return "Done";
}
