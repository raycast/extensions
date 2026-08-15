import { Icon, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import ItemDetails from "~/components/searchVault/ItemDetails";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import BitwardenContext, { useBitwarden } from "~/context/bitwarden";
import { SessionContext, useSession } from "~/context/session";
import { useVaultContext, VaultContext } from "~/context/vault";
import { useVaultListeners, VaultListenersContext } from "../context/vaultListeners";

/**
 * Action that pushes a full-detail screen for the currently selected vault item.
 *
 * Because Raycast's `useNavigation().push` mounts the target component in a
 * fresh React tree, all ancestor contexts (Bitwarden CLI, session, vault, and
 * vault listeners) must be explicitly re-provided around {@link ItemDetails}.
 */
function ShowItemDetailsAction() {
  const { push } = useNavigation();

  const bitwarden = useBitwarden();
  const session = useSession();
  const vault = useVaultContext();
  const vaultListeners = useVaultListeners();
  const selectedItem = useSelectedVaultItem();

  const showDetails = () => {
    push(
      <BitwardenContext.Provider value={bitwarden}>
        <SessionContext.Provider value={session}>
          <VaultListenersContext.Provider value={vaultListeners}>
            <VaultContext.Provider value={vault}>
              <ItemDetails selectedItem={selectedItem} />
            </VaultContext.Provider>
          </VaultListenersContext.Provider>
        </SessionContext.Provider>
      </BitwardenContext.Provider>
    );
  };

  return (
    <ActionWithReprompt
      title="Show Details"
      icon={Icon.List}
      onAction={showDetails}
      repromptDescription={`Showing the details of <${selectedItem.name}>`}
    />
  );
}

export default ShowItemDetailsAction;
