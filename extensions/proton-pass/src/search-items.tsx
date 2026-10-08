import { getPreferenceValues } from "@raycast/api";
import { VaultsView } from "./lib/vaults-view";

/** Browse Items: the vault list, with all items open on top of it unless Open On is set to the vaults. */
export default function Command() {
  const { openOn } = getPreferenceValues<Preferences.SearchItems>();
  return <VaultsView startOnItems={openOn !== "vaults"} />;
}
