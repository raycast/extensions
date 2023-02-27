import { Action, ActionPanel, Detail, getPreferenceValues, Icon } from "@raycast/api";
import CopyPasswordAction from "~/components/actions/CopyPassword";
import PastePasswordAction from "~/components/actions/PastePassword";
import ComponentReverser from "~/components/ComponentReverser";
import SearchCommonActions from "~/components/search/CommonActions";
import { Item, Reprompt } from "~/types/search";
import { capitalize, codeBlock } from "~/utils/strings";

const { primaryAction } = getPreferenceValues();

export type SearchItemActionsProps = {
  item: Item;
  copyTotp: (id: string) => void;
  syncItems: () => void;
  lockVault: () => void;
  logoutVault: () => void;
};

const SearchItemActions = (props: SearchItemActionsProps) => {
  const { item, copyTotp, syncItems, lockVault, logoutVault } = props;
  const { login, notes, card, identity, fields } = item;
  const { password, totp, username } = login ?? {};

  const handleCopyTotp = () => copyTotp(item.id);

  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`uri${index + 1}`, uri.uri]) || []
  );

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
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {!!notes && (
          <Action.Push
            title="Show Secure Note"
            icon={Icon.BlankDocument}
            target={
              <Detail
                markdown={codeBlock(notes)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Secure Notes" content={notes} />
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
            <Action.CopyToClipboard key={`${index}-${title}`} title={`Copy ${capitalize(title)}`} content={content} />
          ) : null
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <SearchCommonActions syncItems={syncItems} lockVault={lockVault} logoutVault={logoutVault} />
      </ActionPanel.Section>
    </>
  );
};

export default SearchItemActions;
