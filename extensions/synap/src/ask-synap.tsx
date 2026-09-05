import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { ask, ConnectionProblem } from "./api/client";
import { ConnectionErrorEmptyView, useConnection } from "./components/connection";
import { openAppUrl } from "./utils/deeplinks";

type AnswerItem = Record<string, unknown>;

function itemTitle(item: AnswerItem, fallback: string): string {
  for (const key of ["title", "name", "fact", "content", "summary", "id"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.slice(0, 180);
  }
  return fallback;
}

function itemSubtitle(item: AnswerItem): string | undefined {
  for (const key of ["description", "content", "summary", "type", "profileSlug"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.slice(0, 220);
  }
  return undefined;
}

function verdictTitle(verdict: string): string {
  if (verdict === "confident") return "Confident retrieval";
  if (verdict === "ambiguous") return "Ambiguous retrieval";
  if (verdict === "empty") return "No matching evidence";
  return verdict;
}

export default function AskSynap() {
  const [query, setQuery] = useState("");
  const { connection, isLoading: connectionLoading, podKey } = useConnection();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (question: string, _pod: string) => ask({ query: question, limit: 10 }),
    [query, podKey],
    { execute: !!connection && query.trim().length > 1, keepPreviousData: true }
  );

  if (!connectionLoading && !connection) {
    return <ConnectionErrorEmptyView error={new ConnectionProblem("not-configured", null)} />;
  }

  if (error) {
    return (
      <List
        navigationTitle="Ask Synap"
        searchBarPlaceholder="Ask about your work, plans, or knowledge…"
        onSearchTextChange={setQuery}
      >
        <ConnectionErrorEmptyView error={error} onRetry={revalidate} />
      </List>
    );
  }

  const answers = data?.answers ?? [];
  const answerItems: Array<AnswerItem & { substrate: string; index: number }> = answers.flatMap((block) =>
    block.items.map((item, index) => ({ ...item, substrate: block.substrate, index }))
  );

  return (
    <List
      isLoading={connectionLoading || isLoading}
      navigationTitle={connection?.podName ? `Ask Synap — ${connection.podName}` : "Ask Synap"}
      searchBarPlaceholder="Ask about your work, plans, or knowledge…"
      onSearchTextChange={setQuery}
      throttle
    >
      {query.trim().length < 2 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="Ask your Synap"
          description="Find a decision, recover context, or understand what is connected to a project."
        />
      ) : data?.verdict ? (
        <List.Section title="Retrieval confidence">
          <List.Item
            icon={Icon.Stars}
            title={verdictTitle(data.verdict)}
            subtitle={data.routedTo.length ? `Read from ${data.routedTo.join(", ")}` : "Grounded in your Synap pod"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Retrieval Details"
                  icon={Icon.Sidebar}
                  target={<Detail markdown={data.verdict} />}
                />
                <Action.CopyToClipboard title="Copy Retrieval Status" content={data.verdict} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {answerItems.length > 0 ? (
        <List.Section title="Evidence" subtitle={`${answerItems.length}`}>
          {answerItems.map((item) => (
            <EvidenceItem
              key={`${item.substrate}-${item.index}-${String(item.id ?? item.title ?? "item")}`}
              item={item}
            />
          ))}
        </List.Section>
      ) : query.trim().length > 1 && !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found" description="Try another name or phrase." />
      ) : null}
    </List>
  );
}

function EvidenceItem({ item }: { item: AnswerItem & { substrate: string } }) {
  const entityId = typeof item.id === "string" && /^[0-9a-f-]{36}$/i.test(item.id) ? item.id : undefined;
  return (
    <List.Item
      icon={Icon.Document}
      title={itemTitle(item, String(item.substrate))}
      subtitle={itemSubtitle(item)}
      accessories={[{ tag: { value: String(item.substrate) } }]}
      actions={
        <ActionPanel>
          {entityId && <Action.OpenInBrowser title="Open Entity in Synap" url={openAppUrl("entity", entityId)} />}
          <Action.CopyToClipboard title="Copy Evidence" content={JSON.stringify(item, null, 2)} />
        </ActionPanel>
      }
    />
  );
}
