import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { saveToDownloads } from "../export";
import { accountLabel, alignedText, capitalize, formatDate } from "../format";
import { MercuryLogin } from "../logins";
import { Account } from "../mercury";

// Mercury's API returns the account and routing numbers but not the receiving bank's name or
// address, so those are left for the sender to look up from the routing number.
function wireFields(account: Account): Array<[string, string]> {
  return [
    ["Beneficiary", account.legalBusinessName],
    ["Account number", account.accountNumber],
    ["Routing (ABA)", account.routingNumber],
    ["Account type", capitalize(account.kind)],
  ];
}

export function wireDetailsText(account: Account, login: MercuryLogin): string {
  return alignedText(
    ["Mercury wire details", `${accountLabel(account)} · ${login.name}`],
    [wireFields(account), [["Saved", formatDate(new Date().toISOString())]]],
  );
}

export function WireDetails({ account, login }: { account: Account; login: MercuryLogin }) {
  // Values come from Mercury; escape them so a name with "|" or "*" can't break the table.
  const escape = (value: string) => value.replace(/[\\`*_|[\]<>#]/g, "\\$&").replace(/\n/g, " ");
  const rows = wireFields(account)
    .map(([label, value]) => `| ${label} | ${escape(value)} |`)
    .join("\n");
  const markdown = `# Wire details\n\n**${escape(accountLabel(account))}** · ${escape(login.name)}\n\n| | |\n|---|---|\n${rows}\n`;
  const text = wireDetailsText(account, login);

  return (
    <Detail
      navigationTitle={`Wire Details · ${accountLabel(account)}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Wire Details" content={text} />
          <Action
            title="Save Wire Details"
            icon={Icon.Download}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() =>
              saveToDownloads(
                `mercury-wire-details-${accountLabel(account)
                  .replace(/[^\w]+/g, "-")
                  .toLowerCase()}`,
                ".txt",
                text,
                "wire details",
              )
            }
          />
          <Action.CopyToClipboard
            title="Copy Account Number"
            content={account.accountNumber}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Routing Number"
            content={account.routingNumber}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
