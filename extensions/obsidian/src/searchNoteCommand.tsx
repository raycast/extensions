import { showToast, Toast } from "@raycast/api";

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
    showToast({
      title: "Path Error",
      message: "Something went wrong with your vault path. There are no paths to select from.",
      style: Toast.Style.Failure,
    });
  }
}
