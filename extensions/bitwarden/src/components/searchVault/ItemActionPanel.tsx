import { Action, ActionPanel, environment, getPreferenceValues } from "@raycast/api";
import ComponentReverser from "~/components/ComponentReverser";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import {
  CopyPasswordAction,
  CopyTotpAction,
  CopyUsernameAction,
  OpenUrlInBrowserAction,
  PastePasswordAction,
  ShowCardDetailsAction,
  ShowNotesAction,
  ShowIdentityDetailsAction,
  CopyCardFieldsActions,
  CopyIdentityFieldsActions,
  CopyLoginUrisActions,
  CopyCustomFieldsActions,
  PasteTotpAction,
  CopyPublicKeyAction,
} from "~/components/searchVault/actions";
import { ItemType } from "~/types/vault";
import FavoriteItemActions from "~/components/searchVault/actions/FavoriteItemActions";
import { DebuggingBugReportingActionSection } from "~/components/actions";
import CopyKeyFingerprintAction from "./actions/CopyKeyFingerprintAction";
import CopyPrivateKeyAction from "./actions/CopyPrivateKeyAction";
import { VaultActionsSection } from "~/components/actions";

const { primaryAction } = getPreferenceValues<Preferences.Search>();

const VaultItemActionPanel = () => {
  const { type, id } = useSelectedVaultItem();

  return (
    <ActionPanel>
      {type === ItemType.LOGIN && (
        <ActionPanel.Section>
          <ComponentReverser reverse={primaryAction === "paste"}>
            <CopyPasswordAction />
            <PastePasswordAction />
          </ComponentReverser>
          <CopyTotpAction />
          <PasteTotpAction />
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
      {type === ItemType.SSH_KEY && (
        <ActionPanel.Section>
          <CopyPublicKeyAction />
          <CopyKeyFingerprintAction />
          <CopyPrivateKeyAction />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Custom Fields">
        <CopyCustomFieldsActions />
      </ActionPanel.Section>
      <ActionPanel.Section title="Item Actions">
        <FavoriteItemActions />
      </ActionPanel.Section>
      <VaultActionsSection />
      <DebuggingBugReportingActionSection />
      {environment.isDevelopment && (
        <ActionPanel.Section title="Development">
          <Action.CopyToClipboard title="Copy item UUID" content={id} />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
};

export default VaultItemActionPanel;
