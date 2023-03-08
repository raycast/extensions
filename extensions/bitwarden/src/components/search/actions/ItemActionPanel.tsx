import { ActionPanel, getPreferenceValues } from "@raycast/api";
import CopyPasswordAction from "~/components/search/actions/CopyPasswordAction";
import PastePasswordAction from "~/components/search/actions/PastePasswordAction";
import ComponentReverser from "~/components/ComponentReverser";
import CopyTotpAction from "~/components/search/actions/CopyTotpAction";
import ShowSecureNoteAction from "~/components/search/actions/ShowSecureNoteAction";
import SearchCommonActions from "~/components/search/actions/CommonActions";
import CopyUsernameAction from "~/components/search/actions/CopyUsernameAction";
import CopyTextFieldsActions from "~/components/search/actions/CopyTextFieldsActions";

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
