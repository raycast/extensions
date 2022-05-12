import { showToast, Toast } from "@raycast/api";

import { parseVaults } from "./utils/utils";
import { NoteListObsidian } from "./components/NoteListObsidian";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./utils/interfaces";

export default function Command() {
  const vaults = parseVaults();
  if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} target={(vault: Vault) => <NoteListObsidian vaultPath={vault.path} />} />;
  } else if (vaults.length == 1) {
    return <NoteListObsidian vaultPath={vaults[0].path} />;
  } else {
    showToast({
      title: "Path Error",
      message: "Something went wrong with your vault path. There are no paths to select from.",
      style: Toast.Style.Failure,
    });
  }
}
