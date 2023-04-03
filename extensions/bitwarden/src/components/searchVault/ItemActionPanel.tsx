import { ActionPanel, getPreferenceValues } from "@raycast/api";
import ComponentReverser from "~/components/ComponentReverser";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import {
  CopyPasswordAction,
  CopyTextFieldsActions,
  CopyTotpAction,
  CopyUsernameAction,
  OpenUrlInBrowserAction,
  PastePasswordAction,
  SearchCommonActions,
  ShowCardDetailsAction,
  ShowSecureNoteAction,
} from "~/components/searchVault/actions";

const { primaryAction } = getPreferenceValues();

const VaultItemActionPanel = () => {
  const { login, card } = useSelectedVaultItem();

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
        <ActionPanel.Section>
          <ShowCardDetailsAction />
          <ShowSecureNoteAction />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <CopyTextFieldsActions />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <SearchCommonActions />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default VaultItemActionPanel;
