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
import { Item, Reprompt } from "~/types/search";
import { capitalize, codeBlock } from "~/utils/strings";

const { primaryAction } = getPreferenceValues();

export type SearchItemActionsProps = {
  item: Item;
};

const SearchItemActions = (props: SearchItemActionsProps) => {
  const { item } = props;
  const { login, notes, card, identity, fields } = item;
  const { password, totp, username } = login ?? {};

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
      await Clipboard.copy(totp);
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true });
    } else {
      showToast(Toast.Style.Failure, "Failed to fetch TOTP.");
    }
  }

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
        <SearchCommonActions />
      </ActionPanel.Section>
    </>
  );
};

export default SearchItemActions;
