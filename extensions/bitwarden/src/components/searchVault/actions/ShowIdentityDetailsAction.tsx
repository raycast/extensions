import { Icon, Toast, showToast, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { IDENTITY_KEY_LABEL } from "~/constants/labels";
import { captureException } from "~/utils/development";
import { getIdentityDetailsCopyValue, getIdentityDetailsMarkdown, identityFormOrderSorter } from "~/utils/identity";
import ShowDetailsScreen from "~/components/searchVault/actions/shared/ShowDetailsScreen";

function ShowIdentityDetailsAction() {
  const { push } = useNavigation();
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.identity) return null;

  const showIdentityDetails = async () => {
    try {
      const identity = await getUpdatedVaultItem(selectedItem, (item) => item.identity, "Getting identity details...");
      if (identity) {
        push(
          <ShowDetailsScreen
            label="Identity"
            details={identity}
            itemName={selectedItem.name}
            titleMap={IDENTITY_KEY_LABEL}
            sorter={identityFormOrderSorter}
            getMarkdown={getIdentityDetailsMarkdown}
            getCopyValue={getIdentityDetailsCopyValue}
          />
        );
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get identity details");
      captureException("Failed to show identity details", error);
    }
  };

  return (
    <ActionWithReprompt
      title="Show Identity"
      icon={Icon.Eye}
      onAction={showIdentityDetails}
      repromptDescription={`Showing the identity details of <${selectedItem.name}>`}
    />
  );
}
export default ShowIdentityDetailsAction;
