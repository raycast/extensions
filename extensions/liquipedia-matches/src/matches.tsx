import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getUpcomingMatches } from "./lib/getUpcomingMatches";

export default function MatchesCommand() {
  const { isLoading, data } = useCachedPromise(getUpcomingMatches);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search matches...">
      {data?.map((match, idx) => (
        <List.Item
          key={idx}
          title={`${match.team1} vs ${match.team2}`}
          subtitle={match.tournament}
          accessories={[{ icon: match.team1Icon }, { text: match.time, icon: Icon.Clock }, { icon: match.team2Icon }]}
          actions={
            match.streams.length > 0 ? (
              <ActionPanel>
                <Action.OpenInBrowser title="Open Stream" url={match.streams[0]} />
              </ActionPanel>
            ) : null
          }
        />
      ))}
    </List>
  );
}
