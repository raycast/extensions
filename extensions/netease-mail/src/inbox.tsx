import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { MailActions } from "./components/mail-actions.js";
import { SetupGuide } from "./components/setup-guide.js";
import { formatRelativeDate } from "./lib/date.js";
import { fetchMail } from "./lib/mail-client.js";
import { hasMailCredentials } from "./lib/preferences.js";

export default function Command() {
  if (!hasMailCredentials()) {
    return <SetupGuide />;
  }

  const [filter, setFilter] = useState("all");
  const [loadLimit, setLoadLimit] = useState(50);
  const unreadOnly = filter === "unread";
  const { data, isLoading, error, revalidate } = useCachedPromise(
    fetchMail,
    [{ unreadOnly, limit: loadLimit, days: null }],
    {
      keepPreviousData: true,
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter loaded messages..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Mailbox filter"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setLoadLimit(50);
          }}
        >
          <List.Dropdown.Item title="Unread" value="unread" />
          <List.Dropdown.Item title="Inbox" value="all" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load mail"
          description={error instanceof Error ? error.message : String(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : null}
      {data?.map((message) => (
        <List.Item
          key={message.uid}
          icon={message.seen ? Icon.Envelope : Icon.Envelope}
          title={message.subject}
          subtitle={message.from}
          accessories={[
            {
              text: message.seen ? "Read" : "Unread",
              icon: message.seen ? Icon.CheckCircle : Icon.Circle,
            },
            { text: formatRelativeDate(message.date) },
          ]}
          detail={<List.Item.Detail markdown={message.snippet} />}
          actions={<MailActions message={message} onMarkedRead={revalidate} />}
        />
      ))}
      {data && data.length >= loadLimit ? (
        <List.Item
          icon={Icon.Plus}
          title="Load More"
          subtitle={`Showing ${data.length} messages`}
          actions={
            <ActionPanel>
              <Action title="Load More" icon={Icon.Plus} onAction={() => setLoadLimit((value) => value + 50)} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
