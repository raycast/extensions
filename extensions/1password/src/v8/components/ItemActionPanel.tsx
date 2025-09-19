import { Action, ActionPanel, Icon } from "@raycast/api";
import { CopyToClipboard } from "./ActionCopyToClipboard";
import { ShareItem } from "./ActionShareItem";
import { Item, User } from "../types";
import { ActionID, hrefToOpenInBrowser } from "../utils";
import resetCache from "../../reset-cache";
import { SwitchAccount } from "./ActionSwitchAccount";

export function ItemActionPanel({
  account,
  item,
  actions,
}: {
  account: User | undefined;
  item: Item;
  actions: ActionID[];
}) {
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
          case "copy-one-time-password":
            return CopyOneTimePassword(item);
          case "paste-username":
            return PasteUsername(item);
          case "paste-password":
            return PastePassword(item);
          case "paste-one-time-password":
            return PasteOneTimePassword(item);
          case "share-item":
            return CopyShareItem(item);
        }
      })}
      <ActionPanel.Section>
        {SwitchAccount()}
        <Action title="Reset Cache" icon={Icon.Trash} onAction={() => resetCache()}></Action>
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function OpenIn1Password(account: User | undefined, item: Item) {
  if (account) {
    return (
      <Action.Open
        key="open-in-1password"
        // eslint-disable-next-line @raycast/prefer-title-case
        title="Open in 1Password"
        target={`onepassword://view-item/?a=${account.account_uuid}&v=${item.vault.id}&i=${item.id}`}
        application="com.1password.1password"
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      />
    );
  } else {
    return null;
  }
}

function OpenInBrowser(item: Item) {
  const href = hrefToOpenInBrowser(item);
  if (href) {
    return (
      <Action.OpenInBrowser
        key="open-in-browser"
        title="Open in Browser"
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

function CopyOneTimePassword(item: Item) {
  return (
    <CopyToClipboard
      id={item.id}
      key="copy-one-time-password"
      vault_id={item.vault.id}
      field="one-time password"
      attribute="otp"
      shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
    />
  );
}

function PasteUsername(item: Item) {
  return (
    <CopyToClipboard
      id={item.id}
      key="paste-username"
      vault_id={item.vault.id}
      field="username"
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      isPasteAction
    />
  );
}

function PastePassword(item: Item) {
  return (
    <CopyToClipboard
      id={item.id}
      key="paste-password"
      vault_id={item.vault.id}
      field="password"
      shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
      isPasteAction
    />
  );
}

function PasteOneTimePassword(item: Item) {
  return (
    <CopyToClipboard
      id={item.id}
      key="paste-one-time-password"
      vault_id={item.vault.id}
      field="one-time password"
      attribute="otp"
      shortcut={{ modifiers: ["cmd", "ctrl"], key: "v" }}
      isPasteAction
    />
  );
}

function CopyShareItem(item: Item) {
  return (
    <ShareItem id={item.id} key="share-item" title={item.title} shortcut={{ modifiers: ["cmd", "shift"], key: "s" }} />
  );
}
