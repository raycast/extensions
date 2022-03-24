import { showToast, ToastStyle } from "@raycast/api";

import { parseVaults } from "./VaultUtils";
import { NoteList } from "./components/NoteList";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./interfaces";

export default function Command() {
  const vaults = parseVaults();
  if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} target={(vault: Vault) => <NoteList vaultPath={vault.path} />} />;
  } else if (vaults.length == 1) {
    return <NoteList vaultPath={vaults[0].path} />;
  } else {
    showToast(ToastStyle.Failure, "Path Error", "Something went wrong with your vault path.");
  }
}
