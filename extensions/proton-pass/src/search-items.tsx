import { VaultsView } from "./lib/vaults-view";

/** Browse Items: all items, open on top of the vault list, which Esc goes back to. */
export default function Command() {
  return <VaultsView startOnItems />;
}
