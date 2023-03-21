import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Detail,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import CopyPasswordAction from "~/components/actions/CopyPassword";
import PastePasswordAction from "~/components/actions/PastePassword";
import ComponentReverser from "~/components/ComponentReverser";
import SearchCommonActions from "~/components/searchVault/CommonActions";
import { useBitwarden } from "~/context/bitwarden";
import { useSession } from "~/context/session";
import { Item, Reprompt } from "~/types/vault";
import { getCardDetailsCopyValue, getCardDetailsMarkdown } from "~/utils/cards";
import { getTransientCopyPreference } from "~/utils/preferences";
import { capitalize, codeBlock } from "~/utils/strings";

const { primaryAction } = getPreferenceValues();

export type SearchItemActionsProps = {
  item: Item;
};

const SearchItemActions = (props: SearchItemActionsProps) => {
  const { item } = props;
  const { login, notes, card, identity, fields } = item;
  const { password, totp, username, uris } = login ?? {};

  const session = useSession();
  const bitwarden = useBitwarden();

  const handleCopyTotp = () => copyTotp(item.id);

  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`uri${index + 1}`, uri.uri]) || []
  );

  async function copyTotp(id: string) {
    if (session.token) {
      const toast = await showToast(Toast.Style.Success, "Copying TOTP Code...");
      const totp = await bitwarden.getTotp(id, session.token);
      await Clipboard.copy(totp, { transient: getTransientCopyPreference("other") });
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true });
    } else {
      showToast(Toast.Style.Failure, "Failed to fetch TOTP.");
    }
  }

  const mainUri = uris?.[0]?.uri;

  return (
    <>
      {!!login && (
        <ActionPanel.Section>
          {!!password && (
            <ComponentReverser reverse={primaryAction === "copy"}>
              <PastePasswordAction
                key="paste"
                item={item}
                content={password}
                reprompt={item.reprompt === Reprompt.REQUIRED}
              />
              <CopyPasswordAction
                key="copy"
                item={item}
                content={password}
                reprompt={item.reprompt === Reprompt.REQUIRED}
              />
            </ComponentReverser>
          )}
          {!!totp && (
            <Action
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              title="Copy TOTP"
              icon={Icon.Clipboard}
              onAction={handleCopyTotp}
            />
          )}
          {!!username && (
            <Action.CopyToClipboard
              title="Copy Username"
              content={username}
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              transient={getTransientCopyPreference("other")}
            />
          )}
          {!!mainUri && (
            <Action.OpenInBrowser
              title="Open in Browser"
              url={mainUri}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {!!card && (
          <Action.Push
            title="Show Card Details"
            icon={Icon.CreditCard}
            target={
              <Detail
                markdown={getCardDetailsMarkdown(card)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Card Details"
                      content={getCardDetailsCopyValue(card)}
                      transient={getTransientCopyPreference("other")}
                    />
                  </ActionPanel>
                }
              />
            }
          />
        )}
        {!!notes && (
          <Action.Push
            title="Show Secure Note"
            icon={Icon.BlankDocument}
            target={
              <Detail
                markdown={codeBlock(notes)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Secure Notes"
                      content={notes}
                      transient={getTransientCopyPreference("other")}
                    />
                  </ActionPanel>
                }
              />
            }
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {Object.entries({ notes, ...card, ...identity, ...fieldMap, ...uriMap }).map(([title, content], index) =>
          content ? (
            <Action.CopyToClipboard
              key={`${index}-${title}`}
              title={`Copy ${capitalize(title)}`}
              content={content}
              transient={getTransientCopyPreference("password")}
            />
          ) : null
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <SearchCommonActions />
      </ActionPanel.Section>
    </>
  );
};

export default SearchItemActions;
