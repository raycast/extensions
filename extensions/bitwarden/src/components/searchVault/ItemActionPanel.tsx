import { ActionPanel, environment, getPreferenceValues } from "@raycast/api";
import ComponentReverser from "~/components/ComponentReverser";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import {
  CopyPasswordAction,
  CopyTotpAction,
  CopyUsernameAction,
  OpenUrlInBrowserAction,
  PastePasswordAction,
  VaultManagementActions,
  ShowCardDetailsAction,
  ShowNotesAction,
  ShowIdentityDetailsAction,
  CopyCardFieldsActions,
  CopyIdentityFieldsActions,
  CopyLoginUrisActions,
  CopyCustomFieldsActions,
} from "~/components/searchVault/actions";
import { ItemType } from "~/types/vault";
import FavoriteItemActions from "~/components/searchVault/actions/FavoriteItemActions";

const { primaryAction } = getPreferenceValues();

const VaultItemActionPanel = () => {
  const { type, id } = useSelectedVaultItem();

  return (
    <ActionPanel title={environment.isDevelopment ? id : undefined}>
      {type === ItemType.LOGIN && (
        <ActionPanel.Section>
          <ComponentReverser reverse={primaryAction === "copy"}>
            <PastePasswordAction />
            <CopyPasswordAction />
          </ComponentReverser>
          <CopyTotpAction />
          <CopyUsernameAction />
          <OpenUrlInBrowserAction />
          <CopyLoginUrisActions />
          <ShowNotesAction />
        </ActionPanel.Section>
      )}
      {type === ItemType.CARD && (
        <>
          <ActionPanel.Section>
            <ShowCardDetailsAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="Card Fields">
            <CopyCardFieldsActions />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ShowNotesAction />
          </ActionPanel.Section>
        </>
      )}
      {type === ItemType.IDENTITY && (
        <>
          <ActionPanel.Section>
            <ShowIdentityDetailsAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="Identity Fields">
            <CopyIdentityFieldsActions />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ShowNotesAction />
          </ActionPanel.Section>
        </>
      )}
      {type === ItemType.NOTE && (
        <ActionPanel.Section>
          <ShowNotesAction />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Custom Fields">
        <CopyCustomFieldsActions />
      </ActionPanel.Section>
      <ActionPanel.Section title="Item Actions">
        <FavoriteItemActions />
      </ActionPanel.Section>
      <ActionPanel.Section title="Vault Management">
        <VaultManagementActions />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default VaultItemActionPanel;
