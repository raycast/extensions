import { ActionPanel, getPreferenceValues } from "@raycast/api";
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

const { primaryAction } = getPreferenceValues();

const VaultItemActionPanel = () => {
  const { type } = useSelectedVaultItem();

  return (
    <ActionPanel>
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
      <ActionPanel.Section title="Vault Management">
        <VaultManagementActions />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default VaultItemActionPanel;
