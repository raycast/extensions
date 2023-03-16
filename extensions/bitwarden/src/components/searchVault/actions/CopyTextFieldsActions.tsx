import { Icon } from "@raycast/api";
import { capitalize } from "~/utils/strings";
import CopyWithRepromptAction from "~/components/searchVault/actions/CopyWithRepromptAction";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";

function CopyTextFieldsActions() {
  const { login, notes, card, identity, fields, name } = useSelectedVaultItem();

  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`uri${index + 1}`, uri.uri]) || []
  );

  return (
    <>
      {Object.entries({ notes, ...card, ...identity, ...fieldMap, ...uriMap }).map(([title, content], index) => {
        if (!content) return null;
        const capitalizedTitle = capitalize(title);
        return (
          <CopyWithRepromptAction
            key={`${index}-${title}`}
            title={`Copy ${capitalizedTitle}`}
            name={capitalizedTitle}
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
