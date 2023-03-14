import { Action, Icon } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";

function OpenUrlInBrowserAction() {
  const { login } = useSelectedVaultItem();
  const mainUri = login?.uris?.[0]?.uri;

  if (!mainUri) return null;

  return (
    <Action.OpenInBrowser
      title="Open in Browser"
      url={mainUri}
      icon={Icon.Globe}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
    />
  );
}

export default OpenUrlInBrowserAction;
