import { Icon, Toast, showToast, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { cardBitwardenPageFieldOrderSorter, getCardDetailsCopyValue, getCardDetailsMarkdown } from "~/utils/cards";
import { captureException } from "~/utils/development";
import { CARD_KEY_LABEL } from "~/constants/labels";
import ShowDetailsScreen from "~/components/searchVault/actions/shared/ShowDetailsScreen";

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
          <ShowDetailsScreen
            label="Card"
            details={card}
            itemName={selectedItem.name}
            titleMap={CARD_KEY_LABEL}
            sorter={cardBitwardenPageFieldOrderSorter}
            getMarkdown={getCardDetailsMarkdown}
            getCopyValue={getCardDetailsCopyValue}
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
      title="Show Card"
      icon={Icon.Eye}
      onAction={showCardDetails}
      repromptDescription={`Showing the card details of <${selectedItem.name}>`}
    />
  );
}

export default ShowCardDetailsAction;
