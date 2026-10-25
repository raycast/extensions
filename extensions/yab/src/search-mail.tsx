import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { attempt } from "./components";
import { MailHit, mailHits, mailMarkdown } from "./parse";
import { callTool, showMail } from "./yab";

function MailDetail({ id }: { id: string }) {
  const { data, isLoading } = useCachedPromise((thread: string) => callTool("mail_read", { thread }), [id]);
  return <List.Item.Detail isLoading={isLoading} markdown={data ? mailMarkdown(data) : ""} />;
}

function tomorrowMorning(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

async function act(hit: MailHit, action: string, done: string, until?: string) {
  try {
    await callTool("mail_act", { thread: hit.id, do: action, ...(until ? { until } : {}) });
    await showToast({ style: Toast.Style.Success, title: done });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Yab couldn't do that",
      message: String((error as Error).message),
    });
  }
}

export default function Command() {
  const [text, setText] = useState("");
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (q: string) =>
      q.trim()
        ? mailHits(await callTool("mail_search", { query: q.trim() }))
        : mailHits(await callTool("mail_search", { query: "in:inbox" })),
    [text],
    { keepPreviousData: true },
  );
  const hits = data ?? [];
  const accounts = [...new Set(hits.map((h) => h.account))];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hits.length > 0}
      throttle
      filtering={false}
      onSearchTextChange={setText}
      searchBarPlaceholder="Search mail, as in Yab: from:anna has:attachment…"
    >
      <List.EmptyView
        icon={Icon.Envelope}
        title={error ? "Yab's mail isn't reachable" : text ? "No mail says that" : "Nothing in the inbox"}
        description={error ? String(error.message) : "Mail is set up in Yab, Settings › Mail."}
      />
      {accounts.map((account) => (
        <List.Section key={account} title={accounts.length > 1 ? account : undefined}>
          {hits
            .filter((h) => h.account === account)
            .map((hit) => (
              <List.Item
                key={hit.id}
                icon={{
                  source: Icon.Envelope,
                  tintColor: hit.labels.some((l: string) => /respond|important/i.test(l))
                    ? Color.Orange
                    : Color.SecondaryText,
                }}
                title={hit.subject || "(no subject)"}
                subtitle={hit.from}
                accessories={[{ text: hit.when }]}
                keywords={[hit.from, hit.snippet]}
                detail={<MailDetail id={hit.id} />}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open in Yab"
                      icon={Icon.Envelope}
                      onAction={() => attempt("Couldn't open the mail", () => showMail(hit.id))}
                    />
                    <Action
                      title="Archive"
                      icon={Icon.Tray}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      onAction={async () => {
                        await act(hit, "archive", "Archived");
                        revalidate();
                      }}
                    />
                    <Action
                      title="Remind Me Tomorrow"
                      icon={Icon.Clock}
                      shortcut={{ modifiers: ["cmd"], key: "h" }}
                      onAction={() => act(hit, "snooze", "Back tomorrow morning", tomorrowMorning())}
                    />
                    <Action
                      title="Unsubscribe"
                      icon={Icon.BellDisabled}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        const ok = await confirmAlert({
                          title: `Unsubscribe from ${hit.from}?`,
                          primaryAction: { title: "Unsubscribe", style: Alert.ActionStyle.Destructive },
                        });
                        if (ok) await act(hit, "unsubscribe", "Unsubscribed");
                      }}
                    />
                    <Action.CopyToClipboard title="Copy Subject" content={hit.subject} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
