import { Action, Icon } from "@raycast/api";
import { capitalize } from "~/utils/strings";
import CopyWithRepromptAction from "~/components/searchVault/actions/CopyWithRepromptAction";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";

function CopyTextFieldsActions() {
  const { login, notes, card, identity, fields, name } = useSelectedVaultItem();

  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`URI ${index + 1}`, uri.uri]) || []
  );

  return (
    <>
      {Object.entries(uriMap).map(([title, content], index) => {
        if (!content) return null;

        return (
          <Action.CopyToClipboard
            key={`${index}-${title}`}
            title={`Copy ${title}`}
            icon={Icon.Clipboard}
            content={content}
          />
        );
      })}
      {Object.entries({ notes, ...card, ...identity, ...fieldMap }).map(([title, content], index) => {
        if (!content) return null;

        const capitalizedTitle = capitalize(title);
        return (
          <CopyWithRepromptAction
            key={`${index}-${title}`}
            title={`Copy ${capitalizedTitle}`}
            icon={Icon.Clipboard}
            content={content}
            repromptDescription={`Copying the ${capitalizedTitle} of <${name}>`}
          />
        );
      })}
    </>
  );
}

export default CopyTextFieldsActions;
