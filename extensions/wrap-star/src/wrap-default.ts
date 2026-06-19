import { getPreferenceValues } from "@raycast/api";
import { wrapSelection, WrapperKey } from "./lib/wrap";

interface Preferences {
  defaultWrapper: WrapperKey;
}

export default async function Command() {
  const { defaultWrapper } = getPreferenceValues<Preferences>();
  await wrapSelection(defaultWrapper);
}
