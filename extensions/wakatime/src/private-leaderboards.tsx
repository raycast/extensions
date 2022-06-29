import { usePrivateLeaderBoards } from "./hooks";
import { Action, ActionPanel, List } from "@raycast/api";

import LeaderBoard from "./leaderboard";

export default function Command() {
  const { data, isLoading } = usePrivateLeaderBoards();

  return (
    <List isLoading={isLoading}>
      {data?.data.map((i) => (
        <List.Item
          key={i.id}
          title={i.name}
          actions={
            <ActionPanel>
              <Action.Push title="View Leaderboard" target={<LeaderBoard id={i.id} />} />
              <Action.OpenInBrowser title="Open in Browser" url={`https://wakatime.com/leaders/sec/${i.id}`} />
            </ActionPanel>
          }
          accessories={[{ text: `${i.members_count} member${i.members_count !== 1 ? "s" : ""}` }]}
        />
      ))}
    </List>
  );
}
