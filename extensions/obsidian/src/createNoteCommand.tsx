import { showToast, Toast } from "@raycast/api";

import { CreateNoteForm } from "./components/CreateNoteForm";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./utils/interfaces";
import { parseVaults } from "./utils/utils";

export default function Command() {
  const vaults = parseVaults();
  if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} target={(vault: Vault) => <CreateNoteForm vaultPath={vault.path} />} />;
  } else if (vaults.length == 1) {
    return <CreateNoteForm vaultPath={vaults[0].path} />;
  } else {
    showToast({
      title: "Path Error",
      message: "Something went wrong with your vault path. There are no paths to select from.",
      style: Toast.Style.Failure,
    });
  }
}
