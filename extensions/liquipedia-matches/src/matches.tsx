import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getUpcomingMatches } from "./lib/getUpcomingMatches";

export default function MatchesCommand() {
  const { isLoading, data, error } = useCachedPromise(getUpcomingMatches);

  if (error) {
    return (
      <List isLoading={false} searchBarPlaceholder="Search matches...">
        <List.EmptyView title="Failed to load matches" description={String(error?.message || error)} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search matches...">
      {!isLoading && (!data || data.length === 0) ? (
        <List.EmptyView title="No matches found" description="Try adjusting your search or check back later." />
      ) : (
        data?.map((match, idx) => (
          <List.Item
            key={idx}
            title={`${match.team1} vs ${match.team2}`}
            subtitle={match.tournament}
            accessories={[{ icon: match.team1Icon }, { text: match.time, icon: Icon.Clock }, { icon: match.team2Icon }]}
            actions={
              match.streams && match.streams.length > 0 ? (
                <ActionPanel>
                  {match.streams.map((url, i) => {
                    let title = `Open Stream ${i + 1}`;
                    try {
                      const host = new URL(url).hostname.replace(/^www\./, "");
                      title = `Open ${host}`;
                    } catch {
                      // fall back to generic title
                    }
                    return <Action.OpenInBrowser key={`${url}-${i}`} title={title} url={url} />;
                  })}
                </ActionPanel>
              ) : null
            }
          />
        ))
      )}
    </List>
  );
}
