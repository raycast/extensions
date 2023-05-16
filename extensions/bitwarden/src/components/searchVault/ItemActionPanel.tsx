import { ActionPanel, getPreferenceValues } from "@raycast/api";
import ComponentReverser from "~/components/ComponentReverser";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import {
  CopyPasswordAction,
  CopyTotpAction,
  CopyUsernameAction,
  OpenUrlInBrowserAction,
  PastePasswordAction,
  SearchCommonActions,
  ShowCardDetailsAction,
  ShowNotesAction,
  ShowIdentityDetailsAction,
  CopyCardFieldsActions,
  CopyIdentityFieldsActions,
  CopyLoginUrisActions,
  CopyCustomFieldsActions,
} from "~/components/searchVault/actions";

const { primaryAction } = getPreferenceValues();

const VaultItemActionPanel = () => {
  const { login, card, identity } = useSelectedVaultItem();

  return (
    <ActionPanel>
      {!!login && (
        <ActionPanel.Section>
          <ComponentReverser reverse={primaryAction === "copy"}>
            <PastePasswordAction />
            <CopyPasswordAction />
          </ComponentReverser>
          <CopyTotpAction />
          <CopyUsernameAction />
          <OpenUrlInBrowserAction />
        </ActionPanel.Section>
      )}
      {!!card && (
        <>
          <ActionPanel.Section>
            <ShowCardDetailsAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="Card Fields">
            <CopyCardFieldsActions />
          </ActionPanel.Section>
        </>
      )}
      {!!identity && (
        <>
          <ActionPanel.Section>
            <ShowIdentityDetailsAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="Identity Fields">
            <CopyIdentityFieldsActions />
          </ActionPanel.Section>
        </>
      )}
      <ActionPanel.Section>
        <CopyLoginUrisActions />
        <ShowNotesAction />
      </ActionPanel.Section>
      <ActionPanel.Section title="Custom Fields">
        <CopyCustomFieldsActions />
      </ActionPanel.Section>
      <ActionPanel.Section title="Vault Management">
        <SearchCommonActions />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default VaultItemActionPanel;
