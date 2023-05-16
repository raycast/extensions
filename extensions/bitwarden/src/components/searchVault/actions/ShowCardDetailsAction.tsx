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
import { Card } from "~/types/vault";
import { cardBitwardenPageFieldOrderSorter, getCardDetailsCopyValue, getCardDetailsMarkdown } from "~/utils/cards";
import { captureException } from "~/utils/development";
import { CARD_KEY_LABEL } from "~/constants/labels";
import { getTransientCopyPreference } from "~/utils/preferences";
import { capitalize } from "~/utils/strings";
import { SHORTCUT_KEY_SEQUENCE } from "~/constants/general";
import { useMemo } from "react";

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
      title="Show Card"
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

  const { sortedCard, sortedCardEntries } = useMemo(() => {
    const sorted: [string, string][] = Object.entries(card).sort(cardBitwardenPageFieldOrderSorter);
    return {
      sortedCard: Object.fromEntries(sorted) as unknown as Card,
      sortedCardEntries: sorted,
    };
  }, [card]);

  return (
    <Detail
      markdown={getCardDetailsMarkdown(itemName, sortedCard)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Card Details"
            content={getCardDetailsCopyValue(sortedCard)}
            transient={getTransientCopyPreference("other")}
          />
          {sortedCardEntries.map(([fieldKey, content], index) => {
            if (!content) return null;

            return (
              <Action
                key={`${index}-${fieldKey}`}
                title={`Copy ${CARD_KEY_LABEL[fieldKey as keyof Card] ?? capitalize(fieldKey)}`}
                icon={Icon.Clipboard}
                onAction={handleCopyField(content)}
                shortcut={{ modifiers: ["cmd"], key: SHORTCUT_KEY_SEQUENCE[index] }}
              />
            );
          })}
        </ActionPanel>
      }
    />
  );
}

export default ShowCardDetailsAction;
