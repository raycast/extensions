import { useState } from "react";
import { Action, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ThreadActions } from "./components/ThreadActions";
import { ThreadPreview } from "./components/ThreadPreview";
import { nyxe, showApiError } from "./lib/raycast";
import { displayAddress } from "./lib/text";

export default function SearchMail() {
  const [query, setQuery] = useState("");
  const [showingDetail, setShowingDetail] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, revalidate } = useCachedPromise(
    async (q: string) => (q.trim() ? await nyxe().search(q.trim(), { limit: 30 }) : null),
    [query],
    { keepPreviousData: true, onError: (err) => showApiError(err, "Search failed") },
  );

  const results = data?.results ?? [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search your mail…"
      throttle
      isShowingDetail={showingDetail && results.length > 0}
      onSelectionChange={setSelectedId}
    >
      {query.trim() === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Nyxe"
          description="Type a name, subject or words from a message."
        />
      ) : (
        <List.EmptyView icon={Icon.Envelope} title="No matches" description="Try other words." />
      )}
      {results.length > 0 ? (
        <List.Section title="Results" subtitle={data ? `${data.total}` : undefined}>
          {results.map((r) => (
            <List.Item
              key={r.emailId}
              id={r.emailId}
              icon={r.hasAttachment ? Icon.Paperclip : Icon.Envelope}
              title={r.subject?.trim() || "(no subject)"}
              subtitle={showingDetail ? undefined : displayAddress(r.from)}
              accessories={showingDetail ? undefined : [{ date: new Date(r.receivedAt) }]}
              detail={
                <ThreadPreview
                  threadId={r.threadId}
                  selected={showingDetail && selectedId === r.emailId}
                  fallback={r.preview}
                />
              }
              actions={
                <ThreadActions
                  threadId={r.threadId}
                  subject={r.subject}
                  senderEmail={r.from?.email}
                  onChanged={revalidate}
                  extra={
                    <Action
                      title={showingDetail ? "Hide Preview" : "Show Preview"}
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => setShowingDetail((v) => !v)}
                    />
                  }
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
