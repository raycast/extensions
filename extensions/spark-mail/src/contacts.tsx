import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { EmailList } from "./components/email-list";
import { SparkNotInstalled } from "./components/states";
import { getSparkPath, isSparkInstalled, parseContacts } from "./lib/spark";

export default function Contacts() {
  if (!isSparkInstalled()) return <SparkNotInstalled />;
  return <ContactsView />;
}

function ContactsView() {
  const [query, setQuery] = useState("");
  const q = query.trim();

  const { data, isLoading, error } = useExec(getSparkPath(), ["contacts", q], {
    execute: q.length > 0,
    keepPreviousData: true,
  });

  if (error) showFailureToast(error, { title: "Contact search failed" });

  const contacts = useMemo(() => (data ? parseContacts(data) : []), [data]);

  return (
    <List
      isLoading={isLoading && q.length > 0}
      throttle
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search contacts by name or email…"
    >
      {q.length === 0 ? (
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="Search Contacts"
          description="Type a name or email address."
        />
      ) : (
        contacts.map((c, i) => (
          <List.Item
            key={`${c.email}-${i}`}
            icon={Icon.PersonCircle}
            title={c.name || c.email}
            subtitle={c.name ? c.email : undefined}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Find Emails from"
                  icon={Icon.Envelope}
                  target={
                    <EmailList
                      navigationTitle={c.name || c.email}
                      args={["search", "--filter", `from:${c.email}`]}
                    />
                  }
                />
                <Action.CopyToClipboard title="Copy Email" content={c.email} />
                {c.name ? (
                  <Action.CopyToClipboard title="Copy Name" content={c.name} />
                ) : null}
                <Action.OpenInBrowser
                  title="New Email"
                  url={`mailto:${c.email}`}
                  icon={Icon.Pencil}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
