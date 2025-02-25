import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { SmallPR, getCachedPRs, markPRAsSeen, SEEN_PRS_KEY, cache } from "./utils";

export default function Command() {
  const [prs, setPrs] = useState<SmallPR[]>([]);

  useEffect(() => {
    setPrs(getCachedPRs());
  }, []);

  const handlePROpen = (pr: SmallPR) => {
    markPRAsSeen(pr);
    setPrs(getCachedPRs());
  };

  const handleToggleSeen = (pr: SmallPR) => {
    if (pr.seen) {
      const seenPRs = new Set(JSON.parse(cache.get(SEEN_PRS_KEY) || "[]"));
      seenPRs.delete(`${pr.repository}-${pr.number}`);
      cache.set(SEEN_PRS_KEY, JSON.stringify(Array.from(seenPRs)));
    } else {
      markPRAsSeen(pr);
    }
    setPrs(getCachedPRs());
  };

  const newPRs = prs.filter((pr) => !pr.seen);
  const seenPRs = prs.filter((pr) => pr.seen);

  return (
    <List
      searchBarPlaceholder="Search by title or author..."
      onSearchTextChange={(text) => {
        const filtered = getCachedPRs().filter((pr) => {
          const searchText = `${pr.title} ${pr.author}`.toLowerCase();
          return searchText.includes(text.toLowerCase());
        });
        setPrs(filtered);
      }}
    >
      <List.Section title="New PRs" subtitle={String(newPRs.length)}>
        {newPRs.length === 0 ? (
          <List.Item title="All caught up!" subtitle="Nothing to review." icon={Icon.Check} />
        ) : (
          newPRs.map((pr) => (
            <List.Item
              key={`${pr.repository}-${pr.number}`}
              title={pr.title}
              subtitle={`#${pr.number} by ${pr.author}`}
              accessories={[{ text: `+${pr.additions}/-${pr.deletions}` }, { text: pr.repository }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={pr.url} onOpen={() => handlePROpen(pr)} />
                  <Action.CopyToClipboard content={pr.url} />
                  <Action
                    title="Mark as Seen"
                    icon={Icon.Eye}
                    onAction={() => handleToggleSeen(pr)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>

      <List.Section title="Seen PRs" subtitle={String(seenPRs.length)}>
        {seenPRs.map((pr) => (
          <List.Item
            key={`${pr.repository}-${pr.number}`}
            title={pr.title}
            subtitle={`#${pr.number} by ${pr.author}`}
            accessories={[{ text: `+${pr.additions}/-${pr.deletions}` }, { text: pr.repository }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={pr.url} />
                <Action.CopyToClipboard content={pr.url} />
                <Action
                  title="Mark as Unseen"
                  icon={Icon.EyeDisabled}
                  onAction={() => handleToggleSeen(pr)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
