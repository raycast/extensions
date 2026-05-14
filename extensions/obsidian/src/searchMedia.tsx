import { List } from "@raycast/api";

import { VaultSelection } from "./components/VaultSelection";
import { MediaSearchArguments } from "./utils/interfaces";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";
import { MediaGrid } from "./components/MediaGrid";
import { useObsidianVaults } from "./utils/hooks";
import { ObsidianVault } from "@/obsidian";

export default function Command(props: { arguments: MediaSearchArguments }) {
  const { vaults, ready } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return (
      <VaultSelection
        vaults={vaults}
        target={(vault: ObsidianVault) => <MediaGrid vault={vault} searchArguments={props.arguments} />}
      />
    );
  } else if (vaults.length == 1) {
    return <MediaGrid vault={vaults[0]} searchArguments={props.arguments} />;
  } else {
    noVaultPathsToast();
    return <List />;
  }
}
