import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { MailActions } from "./components/mail-actions.js";
import { SetupGuide } from "./components/setup-guide.js";
import { formatRelativeDate } from "./lib/date.js";
import { fetchMail } from "./lib/mail-client.js";
import { getMailPreferences, hasMailCredentials } from "./lib/preferences.js";

const DAY_OPTIONS = ["3", "7", "14", "30", "90"];

export default function Command() {
  if (!hasMailCredentials()) {
    return <SetupGuide />;
  }

  const preferences = getMailPreferences();
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(String(preferences.defaultSearchDays));
  const trimmedQuery = query.trim();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (searchText: string, daysText: string) => {
      if (searchText.length < 2) {
        return [];
      }

      return fetchMail({
        query: searchText,
        days: Number.parseInt(daysText, 10) || preferences.defaultSearchDays,
        limit: 50,
      });
    },
    [trimmedQuery, days],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search subject, sender, or message text..."
      searchBarAccessory={
        <List.Dropdown tooltip="Date range" value={days} onChange={setDays}>
          {DAY_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option} title={`${option} days`} value={option} />
          ))}
        </List.Dropdown>
      }
    >
      {trimmedQuery.length < 2 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Type at least 2 characters" />
      ) : null}
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Search failed"
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
          icon={message.seen ? Icon.Envelope : Icon.Circle}
          title={message.subject}
          subtitle={message.from}
          accessories={[{ text: formatRelativeDate(message.date) }]}
          actions={<MailActions message={message} onMarkedRead={revalidate} />}
        />
      ))}
    </List>
  );
}
