import { Action, ActionPanel, Icon, List, showToast } from "@raycast/api";
import { mastodon } from "masto";
import { useMasto } from "../hooks/masto";

export default function AccountItem({ account }: { account: mastodon.v1.Account }) {
  const masto = useMasto();
  return (
    <List.Item
      title={account.displayName || account.username}
      icon={account.avatar}
      accessories={[{ icon: account.locked ? Icon.Lock : undefined }, { text: account.acct }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={account.url} />
          <Action
            icon={Icon.AddPerson}
            title="Follow"
            onAction={async () => {
              await masto?.v1.accounts.follow(account.id);
              showToast({ title: "Successfully followed!" });
            }}
          />
          <Action.CopyToClipboard
            content={"@" + account.acct}
            title="Copy Handle"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
