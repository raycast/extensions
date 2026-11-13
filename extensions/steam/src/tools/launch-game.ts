import { open, Tool } from "@raycast/api";
import { resolveSteamGameById } from "../lib/games";
import { ensureSteamInstalled } from "../lib/steam-client";

type Input = {
  /**
   * Steam app ID of the game. When the user names a game, find its app ID with Search Steam Games or Get Owned Games first.
   */
  appid: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  await ensureSteamInstalled();
  const game = await resolveSteamGameById(input.appid);
  return {
    message: `Launch ${game.name} in Steam?`,
    info: [{ name: "App ID", value: String(game.appid) }],
  };
};

/**
 * Launch a Steam game on this computer through the Steam client. If it is not installed, Steam offers to install it.
 * Use this only when the user asks to play, start, or launch a game.
 */
export default async function launchGameTool(input: Input) {
  await ensureSteamInstalled();
  const game = await resolveSteamGameById(input.appid);
  await open(`steam://rungameid/${game.appid}`);
  return { game, opened: true };
}
