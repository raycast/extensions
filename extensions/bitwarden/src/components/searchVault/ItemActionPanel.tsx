import { Action, ActionPanel, environment, getPreferenceValues } from "@raycast/api";
import ComponentOrderer from "~/components/ComponentOrderer";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import {
  CopyPasswordAction,
  CopyTotpAction,
  CopyUsernameAction,
  OpenUrlInBrowserAction,
  PastePasswordAction,
  PasteUsernameAction,
  ShowNotesAction,
  CopyCardFieldsActions,
  CopyIdentityFieldsActions,
  CopyLoginUrisActions,
  CopyCustomFieldsActions,
  PasteTotpAction,
  CopyPublicKeyAction,
  ShowItemDetailsAction,
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

  const showDetailsAction = <ShowItemDetailsAction data-order-key="showDetails" />;

  return (
    <ActionPanel>
      {type === ItemType.LOGIN && (
        <ActionPanel.Section>
          <ComponentOrderer first={primaryAction}>
            {showDetailsAction}
            <CopyPasswordAction data-order-key="copy" />
            <PastePasswordAction data-order-key="paste" />
          </ComponentOrderer>
          <CopyTotpAction />
          <PasteTotpAction />
          <CopyUsernameAction />
          <PasteUsernameAction />
          <OpenUrlInBrowserAction />
          <CopyLoginUrisActions />
          <ShowNotesAction />
        </ActionPanel.Section>
      )}
      {type === ItemType.CARD && (
        <>
          {showDetailsAction}
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
          {showDetailsAction}
          <ActionPanel.Section title="Identity Fields">
            <CopyIdentityFieldsActions />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ShowNotesAction />
          </ActionPanel.Section>
        </>
      )}
      {type === ItemType.NOTE && (
        <>
          {showDetailsAction}
          <ActionPanel.Section>
            <ShowNotesAction />
          </ActionPanel.Section>
        </>
      )}
      {type === ItemType.SSH_KEY && (
        <>
          <ActionPanel.Section>
            {showDetailsAction}
            <CopyPublicKeyAction />
            <CopyKeyFingerprintAction />
            <CopyPrivateKeyAction />
          </ActionPanel.Section>
        </>
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
