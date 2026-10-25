import { Action, ActionPanel, Color, Icon, launchCommand, LaunchType, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { followedElection, followElection, listElections } from "./election";
import { ElectionResults } from "./results";
import type { ElectionSummary } from "./sources/types";

function dateText(election: ElectionSummary): string {
  return new Date(election.pollsOpen).toLocaleDateString("en-US", {
    timeZone: election.timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    const [elections, followed] = await Promise.all([listElections(), followedElection()]);
    return { elections, followedId: followed?.id };
  });

  async function showInMenuBar(election: ElectionSummary) {
    await followElection(election.id);
    revalidate();
    await showToast({ style: Toast.Style.Success, title: "Shown in the menu bar", message: election.title });
    // Redraw the menu bar now instead of at its next refresh. It fails quietly if the menu bar is off.
    try {
      await launchCommand({ name: "election-results", type: LaunchType.Background });
    } catch {
      // The menu bar command isn't active.
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search elections">
      {error && <List.EmptyView icon={Icon.WifiDisabled} title="Couldn't load elections" description={error.message} />}
      {data?.elections.map((election) => (
        <List.Item
          key={election.id}
          icon={election.flag}
          title={election.title}
          subtitle={election.country}
          keywords={[election.country]}
          accessories={[
            ...(election.id === data.followedId ? [{ tag: { value: "In Menu Bar", color: Color.Blue } }] : []),
            { text: dateText(election) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Results" icon={Icon.BarChart} target={<ElectionResults election={election} />} />
              {election.id !== data.followedId && (
                <Action title="Show in Menu Bar" icon={Icon.Pin} onAction={() => showInMenuBar(election)} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
