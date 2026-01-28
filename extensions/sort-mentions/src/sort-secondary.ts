import { getPreferenceValues } from "@raycast/api";
import { handleInput } from "./utils";

export default async function sortPrimary() {
  const { secondary_handle } = getPreferenceValues<Preferences>();
  await handleInput(secondary_handle);
}
