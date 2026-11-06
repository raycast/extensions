import { VaultsView } from "./lib/vaults-view";

/** Browse Items opened on the vault list, kept as its own command so that its hotkeys and aliases still work. */
export default function Command() {
  return <VaultsView startOnItems={false} />;
}
