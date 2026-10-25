import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ballotIcon, forgetSnapshot, loadSnapshot, phaseOf, scheduleLines, showsVotes, statusText } from "./election";
import type { ElectionSummary } from "./sources/types";

// The results of one election: status, candidates and schedule. Opened from Browse Elections.
export function ElectionResults({ election }: { election: ElectionSummary }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(loadSnapshot, [election]);

  async function refreshNow() {
    await forgetSnapshot(election.id);
    revalidate();
  }

  const actions = (url?: string) => (
    <ActionPanel>
      {url && <Action.OpenInBrowser title="Open TSE Results" url={url} />}
      <Action
        title="Refresh Now"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refreshNow}
      />
    </ActionPanel>
  );

  const navigationTitle = `${election.flag} ${election.title}`;

  if (!data) {
    return (
      <List isLoading={isLoading} navigationTitle={navigationTitle}>
        {error && (
          <List.EmptyView
            icon={Icon.WifiDisabled}
            title="Couldn't load the results"
            description={error.message}
            actions={actions()}
          />
        )}
      </List>
    );
  }

  const phase = phaseOf(data);
  const votes = showsVotes(phase);

  return (
    <List isLoading={isLoading} navigationTitle={navigationTitle}>
      <List.Section title={`${data.flag} ${data.country} · ${data.title}`}>
        <List.Item icon={ballotIcon(data, phase)} title={statusText(data, phase)} actions={actions(data.resultsUrl)} />
        {phase === "late" && (
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title="TSE may be delayed. Check its site for news"
            actions={actions(data.resultsUrl)}
          />
        )}
      </List.Section>
      <List.Section title="Candidates">
        {data.candidates.map((candidate) => (
          <List.Item
            key={candidate.name}
            icon={{ source: Icon.Person, tintColor: candidate.color }}
            title={candidate.name}
            subtitle={candidate.party}
            accessories={
              votes
                ? [
                    { text: `${candidate.votes.toLocaleString("en-US")} votes` },
                    { tag: { value: `${candidate.percent.toFixed(2)}%`, color: candidate.color } },
                  ]
                : []
            }
            actions={actions(data.resultsUrl)}
          />
        ))}
      </List.Section>
      <List.Section title="Schedule">
        {scheduleLines(data, phase).map((line) => (
          <List.Item
            key={line.key}
            icon={line.key === "updated" ? Icon.Clock : Icon.Calendar}
            title={line.title}
            actions={actions(data.resultsUrl)}
          />
        ))}
      </List.Section>
    </List>
  );
}
