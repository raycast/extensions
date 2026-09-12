import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ThreadView } from "./components/thread-view";
import { SparkNotInstalled } from "./components/states";
import {
  getSparkPath,
  isSparkInstalled,
  parseRecords,
  type ParsedRecord,
} from "./lib/spark";
import { senderName, shorten, toRelative } from "./lib/format";

export default function Search() {
  if (!isSparkInstalled()) return <SparkNotInstalled />;
  return <SearchView />;
}

function SearchView() {
  const [query, setQuery] = useState("");
  const topic = query.trim();

  const { data, isLoading, error } = useExec(
    getSparkPath(),
    ["search", topic],
    {
      execute: topic.length > 1,
      keepPreviousData: true,
    },
  );

  if (error) showFailureToast(error, { title: "Search failed" });

  const records = useMemo(
    () => (data ? parseRecords(data).records : []),
    [data],
  );

  return (
    <List
      isLoading={isLoading && topic.length > 1}
      throttle
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search your Spark mailbox…"
    >
      {topic.length <= 1 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Spark"
          description="Type a topic to search across all your mail — keyword + semantic."
        />
      ) : (
        records.map((rec, i) => (
          <ResultItem key={rec.headers.id ?? i} rec={rec} />
        ))
      )}
    </List>
  );
}

function ResultItem({ rec }: { rec: ParsedRecord }) {
  const h = rec.headers;
  const id = h.id;
  const accessories: List.Item.Accessory[] = [];
  if (h.account) accessories.push({ tag: h.account });
  if (h.date) accessories.push({ text: toRelative(h.date) });

  const snippet = rec.body.replace(/\s+/g, " ").trim();

  return (
    <List.Item
      icon={Icon.Envelope}
      title={shorten(h.subject || "(no subject)", 55)}
      subtitle={shorten(h.from ? senderName(h.from) : snippet, 35)}
      accessories={accessories}
      actions={
        <ActionPanel>
          {id ? (
            <Action.Push
              title="Read Thread"
              icon={Icon.Book}
              target={<ThreadView id={id} subject={h.subject} />}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Subject"
            content={h.subject ?? ""}
          />
          {id ? (
            <Action.CopyToClipboard title="Copy Email ID" content={id} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
