import { showHUD } from "@raycast/api";
import { client, getPlayersQuery, setPlayerPauseStateMutation } from "./lib/graphql";

export default async function main() {
  try {
    const queryResponse = await client.query({
      query: getPlayersQuery,
    });

    const players = queryResponse.data.players;

    const anyRunning = players.some((player) => !player.state?.paused);

    const futures = players.map((player) => {
      return client.mutate({
        mutation: setPlayerPauseStateMutation,
        variables: {
          playerSetPausedId: player.id,
          // If any player is running, pause all players. If all players are paused, unpause all players.
          paused: anyRunning,
        },
      });
    });

    await Promise.all(futures);

    await showHUD("Toggled player play states");
  } catch (e) {
    await showHUD("Failed to fetch players");
    return;
  }
}
