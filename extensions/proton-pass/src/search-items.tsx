import { LaunchProps } from "@raycast/api";
import { VaultsView } from "./lib/vaults-view";

export interface BrowseItemsContext {
  /** Set by List Vaults, which opens Browse Items on the vault list. */
  openOn?: "vaults";
}

/** Browse Items: all items, open on top of the vault list, which Esc goes back to. */
export default function Command({ launchContext }: LaunchProps<{ launchContext?: BrowseItemsContext }>) {
  return <VaultsView startOnItems={launchContext?.openOn !== "vaults"} />;
}
