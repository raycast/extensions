import { Akiflow } from "../../utils/akiflow";
import { getPreferenceValues } from "@raycast/api";

/**
 * @returns a list of tags with values that are objects where the key is id and the value is title. Use the tag id when adding a task with a tag.
 */
export default async function () {
  const refreshToken = getPreferenceValues<Preferences>().refreshToken;
  const akiflow = new Akiflow(refreshToken);
  await akiflow.refreshTags();
  await akiflow.tagsPromise;
  return akiflow.tags;
}
