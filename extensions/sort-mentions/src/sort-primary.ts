import { getPreferenceValues } from "@raycast/api";
import { handleInput } from "./utils";

export default async function sortPrimary() {
  const { primary_handle } = getPreferenceValues<Preferences>();
  await handleInput(primary_handle);
}
