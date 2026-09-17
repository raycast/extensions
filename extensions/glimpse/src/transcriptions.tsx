import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { glimpse, HistoryRecord } from "./glimpse";

export default function Command() {
  const [query, setQuery] = useState("");

  const { data, isLoading } = usePromise(
    async (q: string) => {
      const args = q.trim() ? ["history", "search", q, "--limit", "50"] : ["history", "list", "--limit", "50"];
      const res = await glimpse<{ records: HistoryRecord[] }>(args);
      return res.records;
    },
    [query],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search dictations"
      throttle
      isShowingDetail
    >
      {(data ?? []).map((record) => (
        <List.Item
          key={record.id}
          icon={record.status === "error" ? Icon.ExclamationMark : Icon.Text}
          title={oneLine(record.text)}
          detail={
            <List.Item.Detail
              markdown={record.text || "_(empty)_"}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Date" text={new Date(record.timestamp_ms).toLocaleString()} />
                  <List.Item.Detail.Metadata.Label title="Model" text={record.speech_model} />
                  <List.Item.Detail.Metadata.Label title="Words" text={String(record.word_count)} />
                  <List.Item.Detail.Metadata.Label title="Cleaned up" text={record.llm_cleaned ? "Yes" : "No"} />
                  {record.status === "error" ? (
                    <List.Item.Detail.Metadata.Label title="Status" text="Error" icon={Icon.ExclamationMark} />
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={record.text} />
              <Action.Paste content={record.text} />
              <Action
                title="Open in Glimpse"
                icon={Icon.AppWindow}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => openHistory()}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No dictations" description="Your dictations appear here." />
    </List>
  );
}

function oneLine(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > 80 ? `${collapsed.slice(0, 79)}…` : collapsed || "(empty)";
}

async function openHistory() {
  try {
    await glimpse(["open", "history"]);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open Glimpse" });
  }
}
