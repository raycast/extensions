import { Icon } from "@raycast/api";
import { capitalize } from "~/utils/strings";
import CopyWithRepromptAction from "~/components/searchVault/actions/CopyWithRepromptAction";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";

function CopyTextFieldsActions() {
  const { login, notes, card, identity, fields } = useSelectedVaultItem();

  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`uri${index + 1}`, uri.uri]) || []
  );

  return (
    <>
      {Object.entries({ notes, ...card, ...identity, ...fieldMap, ...uriMap }).map(([title, content], index) =>
        content ? (
          <CopyWithRepromptAction
            key={`${index}-${title}`}
            title={`Copy ${capitalize(title)}`}
            icon={Icon.Clipboard}
            content={content}
          />
        ) : null
      )}
    </>
  );
}

export default CopyTextFieldsActions;
