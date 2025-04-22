import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { DockerTag, fetchTagsIncrementally } from "./dockerHubApi";
import { fuzzyFilter } from "./fuzzyFilter";

export default function TagList({ imageName }: { imageName: string }) {
  const [tags, setTags] = useState<DockerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState<Error>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (loadingTags) {
      return;
    }

    setLoading(true);
    setLoadingTags(true);
    setTags([]); // Reset tags when a new image is loaded

    const fetchTags = async () => {
      try {
        for await (const newTags of fetchTagsIncrementally(imageName)) {
          setTags((prevTags) => {
            const seenTags = new Set<number>(prevTags.map((t) => t.id));
            const uniqueNewTags = newTags.filter((t) => !seenTags.has(t.id));

            return [...prevTags, ...uniqueNewTags];
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, [imageName]);

  const filtered = useMemo(
    () => fuzzyFilter(query, tags, (t) => `${t.name} ${t.architectures.join(" ")}`),
    [query, tags]
  );

  return (
    <List
      isLoading={loading}
      filtering={false} // disable Raycast built‑in filter
      navigationTitle={`Tags for ${imageName}`}
      searchBarPlaceholder="Type to fuzzy‑find a tag…"
      onSearchTextChange={setQuery} // keep query in state
    >
      {filtered.map((tag) => (
        <List.Item
          key={`${tag.id}`} // Ensure unique key
          title={tag.name}
          subtitle={tag.architectures.join(", ") + (tag.date && ", updated " + tag.date)}
          keywords={tag.architectures}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={`${imageName}:${tag.name}`} title="Copy Image:tag" />
            </ActionPanel>
          }
        />
      ))}

      {!loading && filtered.length === 0 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing matches that search" />
      )}
      {error && <List.EmptyView icon={Icon.ExclamationMark} title="Failed to load tags" description={String(error)} />}
    </List>
  );
}
