import { List } from "@raycast/api";

import { useObsidianVaults } from "./utils/utils";
import { VaultSelection } from "./components/VaultSelection";
import { MediaSearchArguments, Vault } from "./utils/interfaces";
import { NoVaultFoundMessage } from "./components/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";
import { MediaGrid } from "./components/MediaGrid";

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
        target={(vault: Vault) => <MediaGrid vault={vault} searchArguments={props.arguments} />}
      />
    );
  } else if (vaults.length == 1) {
    return <MediaGrid vault={vaults[0]} searchArguments={props.arguments} />;
  } else {
    noVaultPathsToast();
    return <List />;
  }
}
