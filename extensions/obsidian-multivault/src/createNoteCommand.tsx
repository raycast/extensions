import { getPreferenceValues, List, open, popToRoot } from "@raycast/api";

import { CreateNoteForm } from "./components/CreateNoteForm";
import { SmartVaultSelection } from "./components/SmartVaultSelection";
import { getObsidianTarget, ObsidianTargetType } from "./utils/utils";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";
import { NoteFormPreferences, GlobalPreferences } from "./utils/preferences";
import { useObsidianVaults } from "./utils/hooks";
import { Vault } from "./api/vault/vault.types";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();
  const pref = getPreferenceValues<NoteFormPreferences & GlobalPreferences>();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length >= 1) {
    // Handle blankNote preference for single vault case
    if (vaults.length === 1 && pref.blankNote) {
      const target = getObsidianTarget({
        type: ObsidianTargetType.NewNote,
        vault: vaults[0],
        name: "Blank Note",
        content: "",
      });
      open(target);
      popToRoot();
      return null;
    }
    return (
      <SmartVaultSelection
        vaults={vaults}
        preferences={pref}
        target={(vault: Vault) => (
          <CreateNoteForm vault={vault} showTitle={vaults.length > 1} />
        )}
      />
    );
  } else {
    noVaultPathsToast();
  }
}
