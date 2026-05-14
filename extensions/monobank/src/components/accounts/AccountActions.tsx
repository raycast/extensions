import { Action, ActionPanel, Icon } from "@raycast/api";
import { Account } from "../../types";
import EditForm from "../../views/EditForm";

export default function AccountActions(props: {
  account: Account;
  isPinned: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onPin: (account: Account) => void;
  onRearrange?: (account: Account, direction: "up" | "down") => void;
  onToggleDetails: () => void;
  onCopyTotal: () => void;
  onEdit: (id: string, account: Account) => void;
}) {
  const { account, isPinned, validRearrangeDirections, onPin, onRearrange, onToggleDetails, onCopyTotal, onEdit } =
    props;

  const sendUrl = `https://send.monobank.ua/${account.sendId}`;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {account.sendId && account.currency.code === "UAH" && (
          <>
            <Action.OpenInBrowser title="Open Top up Page" url={sendUrl} />
            <Action.CopyToClipboard title="Copy Top up Page URL" icon={Icon.Link} content={sendUrl} />
          </>
        )}
        <Action.CopyToClipboard
          title="Copy IBAN"
          content={account.iban}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "enter" },
            Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
          }}
        />
        <Action.CopyToClipboard
          title="Copy Balance"
          content={account.balance}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "b" },
            Windows: { modifiers: ["ctrl", "shift"], key: "b" },
          }}
        />
        <Action
          title="Copy Total"
          icon={Icon.CopyClipboard}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "t" },
            Windows: { modifiers: ["ctrl", "shift"], key: "t" },
          }}
          onAction={onCopyTotal}
        />
        <Action.Push
          title="Edit Account"
          icon={Icon.Pencil}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "e" },
            Windows: { modifiers: ["ctrl"], key: "e" },
          }}
          target={<EditForm account={account} onEdit={onEdit} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "d" },
            Windows: { modifiers: ["ctrl", "shift"], key: "d" },
          }}
          onAction={onToggleDetails}
        />
        <Action
          title={!isPinned ? "Pin" : "Unpin"}
          icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
          shortcut={{
            macOS: { key: "p", modifiers: ["cmd", "shift"] },
            Windows: { key: "p", modifiers: ["ctrl", "shift"] },
          }}
          onAction={() => onPin(account)}
        />
        {isPinned && onRearrange && (
          <>
            {validRearrangeDirections?.up && (
              <Action
                title="Move up in Pinned"
                icon={Icon.ArrowUp}
                shortcut={{
                  macOS: { key: "arrowUp", modifiers: ["cmd", "opt"] },
                  Windows: { key: "arrowUp", modifiers: ["ctrl", "alt"] },
                }}
                onAction={() => onRearrange(account, "up")}
              />
            )}

            {validRearrangeDirections?.down && (
              <Action
                title="Move Down in Pinned"
                icon={Icon.ArrowDown}
                shortcut={{
                  macOS: { key: "arrowDown", modifiers: ["cmd", "opt"] },
                  Windows: { key: "arrowDown", modifiers: ["ctrl", "alt"] },
                }}
                onAction={() => onRearrange(account, "down")}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
