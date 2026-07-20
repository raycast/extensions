import { getPreferenceValues } from "@raycast/api";
import { wrapSelection } from "./lib/wrap";

export default async function Command() {
  const { defaultWrapper } = getPreferenceValues<Preferences.WrapDefault>();
  await wrapSelection(defaultWrapper);
}
