import { Action, ActionPanel, List } from "@raycast/api";
import { useTeamFixture } from "@/hooks/useTeamFixture";
import { buildMatchDetailUrl } from "@/utils/url-builder";
import MatchItem from "../common/MatchItem";

export default function TeamView({ id }: { id: string }) {
  const { data, isLoading, error } = useTeamFixture(id);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return <List isLoading={false} searchBarPlaceholder="Error" />;
  }

  const ongoingMatch = data.calculated.ongoingMatch;

  // only get last max 3 matches
  const lastMatches = data.calculated.previousMatches.reverse().slice(0, 5);
  const nextMatches = data.calculated.nextMatches.slice(0, 5);

  const buildAction = (id: string) => {
    return (
      <ActionPanel>
        <Action.OpenInBrowser title="Open Detail in Browser" url={buildMatchDetailUrl(id)} />
      </ActionPanel>
    );
  };

  return (
    <List navigationTitle="Team Detail">
      {/* Upcomming Match */}
      {ongoingMatch && (
        <List.Section key={"upcommingMatch"} title="Ongoing Match">
          <MatchItem key={ongoingMatch.id} match={ongoingMatch} actions={buildAction(`${ongoingMatch.id}`)} />
        </List.Section>
      )}

      {/* Next Matches */}
      {nextMatches && (
        <List.Section key={"nextMatches"} title="Next Matches">
          {nextMatches.map((match) => (
            <MatchItem key={match.id} match={match} actions={buildAction(`${match.id}`)} />
          ))}
        </List.Section>
      )}

      {/* Last Matches */}
      {lastMatches && (
        <List.Section key={"lastMatches"} title="Last Matches">
          {lastMatches.map((match) => (
            <MatchItem key={match.id} match={match} actions={buildAction(`${match.id}`)} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
