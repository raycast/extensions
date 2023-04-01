import { Action, ActionPanel, Icon } from "@raycast/api";
import { CopyToClipboard } from "./ActionCopyToClipboard";
import { Item, User } from "../types";
import { ActionID, hrefToOpenInBrowser } from "../utils";
import resetCache from "../../reset-cache";

export function ItemActionPanel({ account, item, actions }: { account: User; item: Item; actions: ActionID[] }) {
  return (
    <ActionPanel>
      {actions.map((actionId) => {
        switch (actionId) {
          case "open-in-1password":
            return OpenIn1Password(account, item);
          case "open-in-browser":
            return OpenInBrowser(item);
          case "copy-username":
            return CopyUsername(item);
          case "copy-password":
            return CopyPassword(item);
        }
      })}
      <ActionPanel.Section>
        <Action title="Reset Cache" icon={Icon.Trash} onAction={() => resetCache()}></Action>
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function OpenIn1Password(account: User, item: Item) {
  return (
    <Action.Open
      key="open-in-1password"
      title="Open In 1Password"
      target={`onepassword://view-item/?a=${account.account_uuid}&v=${item.vault.id}&i=${item.id}`}
      application="com.1password.1password"
      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
    />
  );
}

function OpenInBrowser(item: Item) {
  const href = hrefToOpenInBrowser(item);
  if (href) {
    return (
      <Action.OpenInBrowser
        key="open-in-browser"
        title="Open In Browser"
        url={href}
        shortcut={{ modifiers: ["opt"], key: "return" }}
      />
    );
  } else {
    return null;
  }
}

function CopyUsername(item: Item) {
  return (
    <CopyToClipboard
      id={item.id}
      key="copy-username"
      vault_id={item.vault.id}
      field="username"
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
    />
  );
}

function CopyPassword(item: Item) {
  return (
    <CopyToClipboard
      id={item.id}
      key="copy-password"
      vault_id={item.vault.id}
      field="password"
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
    />
  );
}
