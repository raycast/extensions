import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { ReactNode } from "react";

import type { Account } from "../lib/accounts";
import { ManageAccountsAction } from "./accounts";
import { RefreshAction } from "./actions";
import { CardDetail } from "./card-detail";
import { CommentForm } from "./comment-form";

/** The action panel for a card in any list: details first, then the browser, then `children`. */
export function CardActions({
  account,
  card,
  onChange,
  children,
}: {
  account: Account;
  card: { id: string; title: string; url: string };
  onChange: () => void;
  children?: ReactNode;
}) {
  return (
    <ActionPanel title={card.title}>
      <ActionPanel.Section>
        <Action.Push
          title="Show Card"
          icon={Icon.Sidebar}
          target={<CardDetail account={account} cardId={card.id} onChange={onChange} />}
        />
        <Action.OpenInBrowser url={card.url} />
        {children}
        <Action.Push
          title="Add Comment"
          icon={Icon.Bubble}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          target={<CommentForm account={account} cardId={card.id} cardTitle={card.title} onCommented={onChange} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Link" content={card.url} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          title="Copy Title"
          content={card.title}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <RefreshAction onRefresh={onChange} />
        <ManageAccountsAction onChange={onChange} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
