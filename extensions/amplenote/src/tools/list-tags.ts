import { amplenote } from "../lib/amplenote";
import { describeError } from "./shared";

/**
 * List the tags in the user's Amplenote account with how many notes use each one.
 */
export default async function () {
  try {
    const tags = await amplenote.getTags();
    return tags.map((tag) => ({ tag: tag.text, noteCount: tag.noteCount ?? null }));
  } catch (error) {
    describeError(error);
  }
}
