import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Account } from "../cli";
import { getDomainFavicon } from "../utils";
import { AccountDetail } from "./accountDetail";

export const ListItem = (props: {
  id: string;
  name: string;
  username?: string;
  password?: string;
  url?: string;
  getDetails: () => Promise<Account>;
}) => (
  <List.Item
    id={props.id}
    key={props.id}
    icon={getDomainFavicon(props.url)}
    title={props.name}
    detail={<AccountDetail getData={props.getDetails} />}
    actions={
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Paste
            icon={Icon.Clipboard}
            title="Paste Password"
            shortcut={{ modifiers: [], key: "enter" }}
            content={props.password || ""}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Paste Username"
            shortcut={{ modifiers: ["shift"], key: "enter" }}
            content={props.username || ""}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Password"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            content={props.password || ""}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Username"
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            content={props.username || ""}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Url"
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            content={props.url || ""}
          />
        </ActionPanel.Section>
      </ActionPanel>
    }
  />
);
