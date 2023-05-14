import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Toast,
  closeMainWindow,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { Card, Identity } from "~/types/vault";
import { getCardDetailsCopyValue, getCardDetailsMarkdown } from "~/utils/cards";
import { captureException } from "~/utils/development";
import { IDENTITY_KEY_LABEL } from "~/constants/labels";
import { getTransientCopyPreference } from "~/utils/preferences";
import { capitalize } from "~/utils/strings";

function ShowCardDetailsAction() {
  const { push } = useNavigation();
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.card) return null;

  const showCardDetails = async () => {
    try {
      const card = await getUpdatedVaultItem(selectedItem, (item) => item.card, "Getting card details...");
      if (card) push(<DetailsScreen itemName={selectedItem.name} card={card} />);
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

function DetailsScreen({ itemName, card }: { itemName: string; card: Card }) {
  const handleCopyField = (value: string) => async () => {
    await Clipboard.copy(value, { transient: getTransientCopyPreference("other") });
    await showHUD("Copied to clipboard");
    await closeMainWindow();
  };

  return (
    <Detail
      markdown={getCardDetailsMarkdown(itemName, card)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Card Details"
            content={getCardDetailsCopyValue(card)}
            transient={getTransientCopyPreference("other")}
          />
          {Object.entries(card).map(([fieldKey, content], index) => {
            if (!content) return null;
            return (
              <Action
                key={`${index}-${fieldKey}`}
                title={`Copy ${IDENTITY_KEY_LABEL[fieldKey as keyof Identity] ?? capitalize(fieldKey)}`}
                icon={Icon.Clipboard}
                onAction={handleCopyField(content)}
              />
            );
          })}
        </ActionPanel>
      }
    />
  );
}

export default ShowCardDetailsAction;
