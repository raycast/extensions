import { Action, Clipboard, closeMainWindow, Icon, showHUD } from "@raycast/api";
import { capitalize } from "~/utils/strings";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyTextFieldsActions() {
  const { login, notes, card, identity, fields, name } = useSelectedVaultItem();

  const fieldMap = Object.fromEntries(fields?.map((field) => [field.name, field.value]) || []);
  const uriMap = Object.fromEntries(
    login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`URI ${index + 1}`, uri.uri]) || []
  );

  const onRepromptAction = (content: string) => async () => {
    await Clipboard.copy(content, { transient: getTransientCopyPreference("other") });
    await showHUD("Copied to Clipboard");
    await closeMainWindow();
  };

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
            transient={getTransientCopyPreference("other")}
          />
        );
      })}
      {Object.entries({ notes, ...card, ...identity, ...fieldMap }).map(([title, content], index) => {
        if (!content) return null;

        const capitalizedTitle = capitalize(title);
        return (
          <ActionWithReprompt
            key={`${index}-${title}`}
            title={`Copy ${capitalizedTitle}`}
            icon={Icon.Clipboard}
            onAction={onRepromptAction(content)}
            repromptDescription={`Copying the ${capitalizedTitle} of <${name}>`}
          />
        );
      })}
    </>
  );
}

export default CopyTextFieldsActions;
