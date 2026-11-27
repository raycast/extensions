import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import type { LaunchProps } from "@raycast/api";
import { CliMissingError, revealMeeting, runCli } from "./cli";

interface SearchHit {
  match_kind: string;
  meeting_id: string;
  meeting_title: string;
  snippet: string;
}

function cleanSnippet(snippet: string): string {
  return snippet
    .replace(/^#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Command(
  props: LaunchProps<{ arguments: { query: string } }>,
) {
  const query = props.arguments.query;
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    runCli<SearchHit[]>("search", query, "--limit", "25")
      .then((result) => {
        if (!cancelled) setHits(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof CliMissingError) {
          setMissing(true);
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (missing) {
    return (
      <List>
        <List.EmptyView
          title="LokalBot CLI not found"
          description="Install LokalBot — https://github.com/stevyhacker/lokalbot/releases"
        />
      </List>
    );
  }

  return (
    <List isLoading={hits === null && error === null}>
      {error ? (
        <List.EmptyView title="Search failed" description={error} />
      ) : hits !== null && hits.length === 0 ? (
        <List.EmptyView title={`No matches for “${query}”`} />
      ) : (
        hits?.map((hit, index) => (
          <List.Item
            key={`${hit.meeting_id}-${hit.match_kind}-${index}`}
            title={hit.meeting_title}
            subtitle={cleanSnippet(hit.snippet)}
            accessories={[{ tag: hit.match_kind }]}
            detail={<List.Item.Detail markdown={hit.snippet} />}
            actions={
              <ActionPanel>
                <Action
                  title="Reveal in Finder"
                  icon={Icon.Finder}
                  onAction={() => revealMeeting(hit.meeting_id)}
                />
                <Action.CopyToClipboard
                  title="Copy Snippet"
                  content={hit.snippet}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
