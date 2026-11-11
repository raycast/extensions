import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { shortcuts } from "../../data/shortcuts";
import { MOCK_API } from "../../mocks/config";
import { MOCK_OWNER } from "../../mocks/owner";
import { Account } from "../../types";
import { formatRequisites, getSendUrl, hasTopUpPage } from "../../utils";
import PinActionsSection, { PinProps } from "../PinActionsSection";
import StatementView from "../statement/StatementView";
import EditAccountForm from "./EditAccountForm";

/** `ownerName` is the name monobank has for the account's owner, used in the requisites. */
export default function AccountActions(props: {
  account: Account;
  ownerName?: string;
  pin: PinProps;
  onToggleDetails: () => void;
  onCopyTotal: () => void;
  onEdit: (id: string, patch: Pick<Account, "title">) => void;
}) {
  const { account, ownerName, pin, onToggleDetails, onCopyTotal, onEdit } = props;
  // With mocks, copied requisites hold no personal data.
  const { fullName, taxId } = MOCK_API ? MOCK_OWNER : getPreferenceValues<Preferences>();
  const sendUrl = getSendUrl(account.sendId);
  // The preference has the patronymic, which monobank's name doesn't.
  const owner = { name: fullName?.trim() || ownerName, taxId };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {hasTopUpPage(account) && (
          <>
            <Action.OpenInBrowser title="Open Top up Page" url={sendUrl} />
            <Action.CopyToClipboard title="Copy Top up Page URL" icon={Icon.Link} content={sendUrl} />
          </>
        )}
        <Action.Push
          title="View Statement"
          icon={Icon.List}
          shortcut={shortcuts.viewStatement}
          target={<StatementView account={account} />}
        />
        <Action.CopyToClipboard title="Copy IBAN" content={account.iban} shortcut={shortcuts.copyIban} />
        <Action.CopyToClipboard
          title="Copy Requisites"
          icon={Icon.Document}
          shortcut={shortcuts.copyRequisites}
          content={formatRequisites(account, owner, "uk")}
        />
        <Action.CopyToClipboard
          title="Copy Requisites in English"
          icon={Icon.Document}
          content={formatRequisites(account, owner, "en")}
        />
        <Action.CopyToClipboard title="Copy Balance" content={account.balance} shortcut={shortcuts.copyBalance} />
        <Action title="Copy Total" icon={Icon.CopyClipboard} shortcut={shortcuts.copyTotal} onAction={onCopyTotal} />
        <Action.Push
          title="Edit Account"
          icon={Icon.Pencil}
          shortcut={shortcuts.edit}
          target={<EditAccountForm account={account} onEdit={onEdit} />}
        />
      </ActionPanel.Section>

      <PinActionsSection {...pin}>
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={shortcuts.toggleDetails}
          onAction={onToggleDetails}
        />
      </PinActionsSection>
    </ActionPanel>
  );
}
