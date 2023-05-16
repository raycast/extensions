import { Action, ActionPanel, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { getCardDetailsCopyValue, getCardDetailsMarkdown } from "~/utils/cards";
import { captureException } from "~/utils/development";
import { getTransientCopyPreference } from "~/utils/preferences";

function ShowCardDetailsAction() {
  const { push } = useNavigation();
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.card) return null;

  const showCardDetails = async () => {
    try {
      const card = await getUpdatedVaultItem(selectedItem, (item) => item.card, "Getting card details...");
      if (card) {
        push(
          <Detail
            markdown={getCardDetailsMarkdown(card)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Card Details"
                  content={getCardDetailsCopyValue(card)}
                  transient={getTransientCopyPreference("other")}
                />
              </ActionPanel>
            }
          />
        );
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get card details");
      captureException("Failed to show card details", error);
    }
  };

  return (
    <ActionWithReprompt
      title="Show Card Details"
      icon={Icon.CreditCard}
      onAction={showCardDetails}
      repromptDescription={`Showing the card details of <${selectedItem.name}>`}
    />
  );
}

export default ShowCardDetailsAction;
