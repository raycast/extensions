import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { NodeActions } from "./components/NodeActions";
import { getNodesByTag, getTagCounts } from "./lib/cache";
import { hasApiKey } from "./lib/preferences";
import { maybeStartBackgroundSync } from "./lib/sync";
import { truncate } from "./lib/nodes";

export default function Command() {
  if (!hasApiKey()) {
    return <MissingApiKeyDetail />;
  }

  return <TagsList />;
}

function normalizeTagValue(value: string): string {
  return value.trim().toLowerCase().replace(/^[@#]/, "");
}

function getTagKindRank(value: string): number {
  if (value.startsWith("#")) return 0;
  if (value.startsWith("@")) return 1;
  return 2;
}

function compareTags(left: string, right: string): number {
  const kindRankCompare = getTagKindRank(left) - getTagKindRank(right);
  if (kindRankCompare !== 0) return kindRankCompare;

  const normalizedCompare = normalizeTagValue(left).localeCompare(normalizeTagValue(right));
  if (normalizedCompare !== 0) return normalizedCompare;

  return left.localeCompare(right);
}

function getTagMatchRank(tag: string, searchText: string): number | null {
  const rawQuery = searchText.trim().toLowerCase();
  const normalizedQuery = normalizeTagValue(searchText);
  if (!normalizedQuery && !rawQuery) return 0;

  const rawTag = tag.toLowerCase();
  const normalizedTag = normalizeTagValue(tag);

  if (rawTag === rawQuery || normalizedTag === normalizedQuery) return 0;
  if (rawTag.startsWith(rawQuery) || normalizedTag.startsWith(normalizedQuery)) return 1;
  if (rawTag.includes(rawQuery) || normalizedTag.includes(normalizedQuery)) return 2;
  return null;
}

function TagsList() {
  const [version, setVersion] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const tags = useMemo(() => getTagCounts(), [version]);

  useEffect(() => {
    maybeStartBackgroundSync((event) => {
      if (event.type === "progress" && event.message) setSyncMessage(event.message);
      if (event.type === "done") {
        setSyncMessage(`Synced ${event.nodeCount ?? 0} items`);
        setVersion((current) => current + 1);
      }
    })?.catch((error) => setSyncMessage(error instanceof Error ? error.message : String(error)));
  }, []);

  const visibleTags = useMemo(() => {
    const query = searchText.trim();
    if (!query) {
      return [...tags].sort((left, right) => {
        if (left.count !== right.count) return right.count - left.count;
        return compareTags(left.tag, right.tag);
      });
    }

    return tags
      .map((tag) => ({ tag, rank: getTagMatchRank(tag.tag, query) }))
      .filter((entry): entry is { tag: (typeof tags)[number]; rank: number } => entry.rank !== null)
      .sort((left, right) => {
        if (left.rank !== right.rank) return left.rank - right.rank;
        if (left.tag.count !== right.tag.count) return right.tag.count - left.tag.count;
        return compareTags(left.tag.tag, right.tag.tag);
      })
      .map((entry) => entry.tag);
  }, [searchText, tags]);

  return (
    <List searchBarPlaceholder="Browse Workflowy tags" key={version} filtering={false} onSearchTextChange={setSearchText}>
      {syncMessage ? <List.EmptyView title={visibleTags.length ? "" : "No tags yet"} description={syncMessage} /> : null}
      {!syncMessage && !visibleTags.length && searchText.trim() ? (
        <List.EmptyView title="No matching tags" description={`No tags match “${searchText.trim()}”.`} />
      ) : null}
      {visibleTags.map((tag) => (
        <List.Item
          key={tag.tag}
          icon={Icon.Tag}
          title={tag.tag}
          accessories={[{ text: String(tag.count) }]}
          actions={
            <ActionPanel>
              <Action.Push title="Browse Tagged Items" target={<TagNodesList tag={tag.tag} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function TagNodesList({ tag }: { tag: string }) {
  const [version, setVersion] = useState(0);
  const nodes = useMemo(() => getNodesByTag(tag), [tag, version]);

  return (
    <List navigationTitle={tag} searchBarPlaceholder={`Browse items tagged ${tag}`}>
      {nodes.map((node) => (
        <List.Item
          key={node.id}
          icon={node.completed > 0 ? Icon.CheckCircle : Icon.BulletPoints}
          title={node.name || "(Untitled)"}
          subtitle={truncate(node.path, 60)}
          accessories={node.note ? [{ text: truncate(node.note, 40), tooltip: node.note }] : []}
          actions={<NodeActions node={node} onDidMutate={() => setVersion((current) => current + 1)} />}
        />
      ))}
    </List>
  );
}
