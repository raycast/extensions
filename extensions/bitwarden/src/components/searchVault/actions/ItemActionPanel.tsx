import { ActionPanel, getPreferenceValues } from "@raycast/api";
import CopyPasswordAction from "~/components/searchVault/actions/CopyPasswordAction";
import PastePasswordAction from "~/components/searchVault/actions/PastePasswordAction";
import ComponentReverser from "~/components/ComponentReverser";
import CopyTotpAction from "~/components/searchVault/actions/CopyTotpAction";
import ShowSecureNoteAction from "~/components/searchVault/actions/ShowSecureNoteAction";
import SearchCommonActions from "~/components/searchVault/actions/CommonActions";
import CopyUsernameAction from "~/components/searchVault/actions/CopyUsernameAction";
import CopyTextFieldsActions from "~/components/searchVault/actions/CopyTextFieldsActions";

const { primaryAction } = getPreferenceValues();

const VaultItemActionPanel = () => (
  <ActionPanel>
    <ActionPanel.Section>
      <ComponentReverser reverse={primaryAction === "copy"}>
        <PastePasswordAction key="paste" />
        <CopyPasswordAction key="copy" />
      </ComponentReverser>
      <CopyTotpAction />
      <CopyUsernameAction />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <ShowSecureNoteAction />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <CopyTextFieldsActions />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <SearchCommonActions />
    </ActionPanel.Section>
  </ActionPanel>
);

export default VaultItemActionPanel;
