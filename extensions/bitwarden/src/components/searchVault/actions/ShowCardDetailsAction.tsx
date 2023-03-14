import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { getCardDetailsCopyValue, getCardDetailsMarkdown } from "~/utils/cards";

function ShowCardDetailsAction() {
  const { card } = useSelectedVaultItem();

  if (!card) return null;

  return (
    <Action.Push
      title="Show Card Details"
      icon={Icon.CreditCard}
      target={
        <Detail
          markdown={getCardDetailsMarkdown(card)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Card Details" content={getCardDetailsCopyValue(card)} />
            </ActionPanel>
          }
        />
      }
    />
  );
}

export default ShowCardDetailsAction;
