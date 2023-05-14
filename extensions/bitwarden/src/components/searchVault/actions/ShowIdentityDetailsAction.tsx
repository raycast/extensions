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
import { CARD_KEY_LABEL } from "~/constants/labels";
import { captureException } from "~/utils/development";
import { getIdentityDetailsCopyValue, getIdentityDetailsMarkdown } from "~/utils/identity";
import { getTransientCopyPreference } from "~/utils/preferences";
import { capitalize } from "~/utils/strings";

function ShowIdentityDetailsAction() {
  const { push } = useNavigation();
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.identity) return null;

  const showIdentityDetails = async () => {
    try {
      const identity = await getUpdatedVaultItem(selectedItem, (item) => item.identity, "Getting identity details...");
      if (identity) push(<DetailsScreen itemName={selectedItem.name} identity={identity} />);
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

function DetailsScreen({ itemName, identity }: { itemName: string; identity: Identity }) {
  const handleCopyField = (value: string) => async () => {
    await Clipboard.copy(value, { transient: getTransientCopyPreference("other") });
    await showHUD("Copied to clipboard");
    await closeMainWindow();
  };

  return (
    <Detail
      markdown={getIdentityDetailsMarkdown(itemName, identity)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Identity Details"
            content={getIdentityDetailsCopyValue(identity)}
            transient={getTransientCopyPreference("other")}
          />
          {Object.entries(identity).map(([fieldKey, content], index) => {
            if (!content) return null;
            return (
              <Action
                key={`${index}-${fieldKey}`}
                title={`Copy ${CARD_KEY_LABEL[fieldKey as keyof Card] ?? capitalize(fieldKey)}`}
                icon={Icon.Clipboard}
                onAction={handleCopyField(fieldKey)}
              />
            );
          })}
        </ActionPanel>
      }
    />
  );
}

export default ShowIdentityDetailsAction;
