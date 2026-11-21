import { Tool } from "@raycast/api";
import { cachedBrandName, sameWriteWithoutSignIn, writeWithTool } from "../lib/socialfaktory";
import type { WritingPlatform } from "../lib/types";
import { confirmationFor, validateToolInput } from "../lib/writing";

type Input = {
  /**
   * The ID of the brand whose voice to write in, as returned by list-brands (it starts with "brand_").
   */
  brandId: string;
  /**
   * What the post should say: the topic, the news or the angle, with any facts, numbers or links it must include. Required to write a new post, left out when checking on one with textGenerationId.
   */
  brief?: string;
  /**
   * The network to write for: "x" or "linkedin". Defaults to "x".
   */
  platform?: WritingPlatform;
  /**
   * The textGenerationId an earlier write-post answer gave with status "still_writing". Pass it with the same brandId to check on that write for free instead of writing again.
   */
  textGenerationId?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.textGenerationId || validateToolInput(input)) return undefined;
  if (await sameWriteWithoutSignIn(input).catch(() => undefined)) return undefined;
  return confirmationFor(input, await cachedBrandName(input.brandId));
};

export default async function tool(input: Input) {
  return writeWithTool(input);
}
