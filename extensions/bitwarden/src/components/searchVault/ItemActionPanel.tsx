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
  ShowNotesAction,
  ShowIdentityDetailsAction,
} from "~/components/searchVault/actions";

const { primaryAction } = getPreferenceValues();

const VaultItemActionPanel = () => {
  const { login } = useSelectedVaultItem();

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
      <ActionPanel.Section>
        <ShowCardDetailsAction />
        <ShowIdentityDetailsAction />
        <ShowNotesAction />
      </ActionPanel.Section>
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
