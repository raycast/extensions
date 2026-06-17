import { Action, ActionPanel, getPreferenceValues, Icon, open, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import resetCache from "../../reset-cache";
import { Item, User } from "../types";
import { ActionID, getCliPath, handleErrors, hrefToOpenInBrowser, windowsEnv } from "../utils";
import { CopyToClipboard } from "./ActionCopyToClipboard";
import { ShareItem } from "./ActionShareItem";
import { SwitchAccount } from "./ActionSwitchAccount";

const execFileAsync = promisify(execFile);

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
            return OpenInBrowser(account, item);
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
      shortcut={{
        macOS: { key: "c", modifiers: ["cmd", "ctrl"] },
        Windows: { key: "c", modifiers: ["ctrl", "shift", "opt"] },
      }}
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
      shortcut={{ macOS: { key: "c", modifiers: ["cmd", "opt"] }, Windows: { key: "c", modifiers: ["ctrl", "opt"] } }}
      vault_id={item.vault.id}
    />
  );
}

function CopyShareItem(item: Item) {
  return (
    <ShareItem
      id={item.id}
      key="share-item"
      shortcut={{
        macOS: { key: "s", modifiers: ["cmd", "shift"] },
        Windows: { key: "s", modifiers: ["ctrl", "shift"] },
      }}
      title={item.title}
    />
  );
}

function CopyUsername(item: Item) {
  return (
    <CopyToClipboard
      field="username"
      id={item.id}
      key="copy-username"
      shortcut={{
        macOS: { key: "c", modifiers: ["cmd", "shift"] },
        Windows: { key: "c", modifiers: ["ctrl", "shift"] },
      }}
      vault_id={item.vault.id}
    />
  );
}

function OpenIn1Password(account: undefined | User, item: Item) {
  if (account) {
    return (
      <Action.Open
        key="open-in-1password"
        shortcut={{
          macOS: { key: "o", modifiers: ["cmd", "shift"] },
          Windows: { key: "o", modifiers: ["ctrl", "shift"] },
        }}
        target={`onepassword://view-item/?a=${account.account_uuid}&v=${item.vault.id}&i=${item.id}`}
        title="Open in 1Password"
      />
    );
  }

  return null;
}

function OpenInBrowser(account: undefined | User, item: Item) {
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

  if (!getPreferenceValues<ExtensionPreferences>().reduceItemListMemoryUsage || item.category !== "LOGIN") {
    return null;
  }

  return (
    <Action
      key="open-in-browser"
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Opening in browser..." });

        try {
          const { stdout } = await execFileAsync(
            getCliPath(),
            [
              ...(account ? ["--account", account.account_uuid] : []),
              "item",
              "get",
              item.id,
              "--vault",
              item.vault.id,
              "--format=json",
            ],
            { encoding: "utf8", maxBuffer: 4096 * 1024, ...(windowsEnv ? { env: windowsEnv } : {}) },
          );
          const detailedItem = JSON.parse(stdout) as Item;
          const detailedHref = hrefToOpenInBrowser(detailedItem);

          if (!detailedHref) {
            toast.style = Toast.Style.Failure;
            toast.title = "No website URL found";
            return;
          }

          await open(detailedHref);
          toast.style = Toast.Style.Success;
          toast.title = "Opened in browser";
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to open in browser";

          if (error instanceof Error) {
            try {
              handleErrors(error.message);
            } catch (err) {
              toast.message = err instanceof Error ? err.message : error.message;
            }
          }
        }
      }}
      shortcut={{ key: "return", modifiers: ["opt"] }}
      title="Open in Browser"
    />
  );
}

function PasteOneTimePassword(item: Item) {
  return (
    <CopyToClipboard
      attribute="otp"
      field="one-time password"
      id={item.id}
      isPasteAction
      key="paste-one-time-password"
      shortcut={{
        macOS: { key: "v", modifiers: ["cmd", "ctrl"] },
        Windows: { key: "v", modifiers: ["ctrl", "shift", "opt"] },
      }}
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
      shortcut={{ macOS: { key: "v", modifiers: ["cmd", "opt"] }, Windows: { key: "v", modifiers: ["ctrl", "opt"] } }}
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
      shortcut={{
        macOS: { key: "v", modifiers: ["cmd", "shift"] },
        Windows: { key: "v", modifiers: ["ctrl", "shift"] },
      }}
      vault_id={item.vault.id}
    />
  );
}
