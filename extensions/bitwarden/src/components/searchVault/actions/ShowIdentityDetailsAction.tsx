import { Action, ActionPanel, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { captureException } from "~/utils/development";
import { getIdentityDetailsCopyValue, getIdentityDetailsMarkdown } from "~/utils/identity";
import { getTransientCopyPreference } from "~/utils/preferences";

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
          <Detail
            markdown={getIdentityDetailsMarkdown(identity)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Identity Details"
                  content={getIdentityDetailsCopyValue(identity)}
                  transient={getTransientCopyPreference("other")}
                />
              </ActionPanel>
            }
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
      title="Show Identity Details"
      icon={Icon.Person}
      onAction={showIdentityDetails}
      repromptDescription={`Showing the identity details of <${selectedItem.name}>`}
    />
  );
}

export default ShowIdentityDetailsAction;
