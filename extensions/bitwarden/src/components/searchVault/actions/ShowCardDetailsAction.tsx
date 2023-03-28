import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { getCardDetailsCopyValue, getCardDetailsMarkdown } from "~/utils/cards";
import { getTransientCopyPreference } from "~/utils/preferences";

function ShowCardDetailsAction() {
  const { push } = useNavigation();
  const { card, name } = useSelectedVaultItem();

  if (!card) return null;

  const showCardDetails = () => {
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
  };

  return (
    <ActionWithReprompt
      title="Show Card Details"
      icon={Icon.CreditCard}
      onAction={showCardDetails}
      repromptDescription={`Showing the card details of <${name}>`}
    />
  );
}

export default ShowCardDetailsAction;
