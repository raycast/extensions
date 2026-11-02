import { VaultsView } from "./lib/vaults-view";

/** List Vaults: the vaults, each opening its items, which Esc leaves for the vaults again. */
export default function Command() {
  return <VaultsView />;
}
