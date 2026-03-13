import { Action, ActionPanel, Icon } from "@raycast/api";

import resetCache from "../../reset-cache";
import { Item, User } from "../types";
import { ActionID, hrefToOpenInBrowser } from "../utils";
import { CopyToClipboard } from "./ActionCopyToClipboard";
import { ShareItem } from "./ActionShareItem";
import { SwitchAccount } from "./ActionSwitchAccount";

export function ItemActionPanel({
  account,
  actions,
  item,
}: {
  account: undefined | User;
  actions: ActionID[];
  item: Item;
}) {
  return (
    <ActionPanel>
      {actions.map((actionId) => {
        switch (actionId) {
          case "copy-one-time-password":
            return CopyOneTimePassword(item);
          case "copy-password":
            return CopyPassword(item);
          case "copy-username":
            return CopyUsername(item);
          case "open-in-1password":
            return OpenIn1Password(account, item);
          case "open-in-browser":
            return OpenInBrowser(item);
          case "paste-one-time-password":
            return PasteOneTimePassword(item);
          case "paste-password":
            return PastePassword(item);
          case "paste-username":
            return PasteUsername(item);
          case "share-item":
            return CopyShareItem(item);
        }
      })}
      <ActionPanel.Section>
        {SwitchAccount()}
        <Action icon={Icon.Trash} onAction={() => resetCache()} title="Reset Cache"></Action>
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function CopyOneTimePassword(item: Item) {
  return (
    <CopyToClipboard
      attribute="otp"
      field="one-time password"
      id={item.id}
      key="copy-one-time-password"
      shortcut={{ key: "c", modifiers: ["cmd", "ctrl"] }}
      vault_id={item.vault.id}
    />
  );
}

function CopyPassword(item: Item) {
  return (
    <CopyToClipboard
      field="password"
      id={item.id}
      key="copy-password"
      shortcut={{ key: "c", modifiers: ["cmd", "opt"] }}
      vault_id={item.vault.id}
    />
  );
}

function CopyShareItem(item: Item) {
  return (
    <ShareItem id={item.id} key="share-item" shortcut={{ key: "s", modifiers: ["cmd", "shift"] }} title={item.title} />
  );
}

function CopyUsername(item: Item) {
  return (
    <CopyToClipboard
      field="username"
      id={item.id}
      key="copy-username"
      shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
      vault_id={item.vault.id}
    />
  );
}

function OpenIn1Password(account: undefined | User, item: Item) {
  if (account) {
    return (
      <Action.Open
        application="com.1password.1password"
        key="open-in-1password"
        shortcut={{ key: "o", modifiers: ["cmd", "shift"] }}
        target={`onepassword://view-item/?a=${account.account_uuid}&v=${item.vault.id}&i=${item.id}`}
        title="Open in 1Password"
      />
    );
  }

  return null;
}

function OpenInBrowser(item: Item) {
  const href = hrefToOpenInBrowser(item);

  if (href) {
    return (
      <Action.OpenInBrowser
        key="open-in-browser"
        shortcut={{ key: "return", modifiers: ["opt"] }}
        title="Open in Browser"
        url={href}
      />
    );
  }

  return null;
}

function PasteOneTimePassword(item: Item) {
  return (
    <CopyToClipboard
      attribute="otp"
      field="one-time password"
      id={item.id}
      isPasteAction
      key="paste-one-time-password"
      shortcut={{ key: "v", modifiers: ["cmd", "ctrl"] }}
      vault_id={item.vault.id}
    />
  );
}

function PastePassword(item: Item) {
  return (
    <CopyToClipboard
      field="password"
      id={item.id}
      isPasteAction
      key="paste-password"
      shortcut={{ key: "v", modifiers: ["cmd", "opt"] }}
      vault_id={item.vault.id}
    />
  );
}

function PasteUsername(item: Item) {
  return (
    <CopyToClipboard
      field="username"
      id={item.id}
      isPasteAction
      key="paste-username"
      shortcut={{ key: "v", modifiers: ["cmd", "shift"] }}
      vault_id={item.vault.id}
    />
  );
}
