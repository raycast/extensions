import { ActionPanel, getPreferenceValues, Icon } from "@raycast/api";
import CopyPasswordAction from "~/components/search/actions/CopyPasswordAction";
import PastePasswordAction from "~/components/search/actions/PastePasswordAction";
import ComponentReverser from "~/components/ComponentReverser";
import CopyTotpAction from "~/components/search/actions/CopyTotpAction";
import ShowSecureNoteAction from "~/components/search/actions/ShowSecureNoteAction";
import SearchCommonActions from "~/components/search/actions/CommonActions";
import { Item } from "~/types/search";
import { capitalize } from "~/utils/strings";
import CopyUsernameAction from "~/components/search/actions/CopyUsernameAction";
import CopyWithRepromptAction from "~/components/search/actions/CopyWithRepromptAction";

const { primaryAction } = getPreferenceValues();

export type SearchItemActionsProps = {
  item: Item;
};

const SearchItemActions = (props: SearchItemActionsProps) => {
  const { item } = props;
  const { login, notes, card, identity, fields } = item;
  const { password, totp, username, uris } = login ?? {};

  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`uri${index + 1}`, uri.uri]) || []
  );
  const mainUri = uris?.[0]?.uri;

  return (
    <>
      {!!login && (
        <ActionPanel.Section>
          <ComponentReverser reverse={primaryAction === "copy"}>
            <PastePasswordAction key="paste" item={item} />
            <CopyPasswordAction key="copy" item={item} />
          </ComponentReverser>
          <CopyTotpAction item={item} />
          <CopyUsernameAction item={item} />
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
                    <Action.CopyToClipboard title="Copy Card Details" content={getCardDetailsCopyValue(card)} />
                  </ActionPanel>
                }
              />
            }
          />
        )}
        {!!notes && <ShowSecureNoteAction item={item} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {Object.entries({ notes, ...card, ...identity, ...fieldMap, ...uriMap }).map(([title, content], index) =>
          content ? (
            <CopyWithRepromptAction
              item={item}
              key={`${index}-${title}`}
              title={`Copy ${capitalize(title)}`}
              icon={Icon.Clipboard}
              content={content}
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
