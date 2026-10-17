import {
  Alert,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { run, settings } from "./utils";

export default async function Command() {
  await run("Restarting servers…", async () => {
    const { universeId, apiKey } = settings("universeId", "apiKey");
    const { closeAllVersions, confirmRestart } =
      getPreferenceValues<Preferences.Restart>();
    if (confirmRestart) {
      let name = "";
      try {
        const response = await fetch(
          `https://games.roblox.com/v1/games?universeIds=${universeId}`,
          { signal: AbortSignal.timeout(3_000) },
        );
        if (response.ok) {
          const { data } = await response.json();
          const game = data.find(
            (game: { id: number }) => String(game.id) === universeId,
          );
          if (typeof game?.name === "string") name = game.name.trim();
        }
      } catch {
        name = "";
      }
      const game = name ? `"${name}"` : "this game";
      if (
        !(await confirmAlert({
          title: "Restart servers?",
          message: `This will restart ${closeAllVersions ? "all servers" : "all outdated servers"} of ${game}`,
          primaryAction: {
            title: "Restart",
            style: Alert.ActionStyle.Destructive,
          },
        }))
      )
        return;
    }

    await closeMainWindow();

    let response: Response;
    try {
      response = await fetch(
        `https://apis.roblox.com/cloud/v2/universes/${universeId}:restartServers`,
        {
          method: "POST",
          headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ closeAllVersions }),
          signal: AbortSignal.timeout(20_000),
          redirect: "error",
        },
      );
    } catch {
      throw new Error("No response. Check servers before retrying.");
    }
    if (!response.ok) {
      const errors: Record<number, string> = {
        401: "Check your API key.",
        403: "Check your API key permissions.",
        404: "Universe not found.",
        429: "Too many requests. Try again later.",
      };
      throw new Error(
        errors[response.status] ?? `Roblox error (${response.status}).`,
      );
    }
    return "Restarting servers...";
  });
}
