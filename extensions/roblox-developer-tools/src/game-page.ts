import { closeMainWindow, open } from "@raycast/api";
import { runWithDelayedToast, settings } from "./utils";

export default async function Command() {
  await closeMainWindow();

  await runWithDelayedToast("Opening Game Page...", async () => {
    const { universeId } = settings("universeId");
    const response = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) {
      throw new Error(
        `Unable to load game details (Roblox ${response.status}).`,
      );
    }
    const body = (await response.json()) as {
      data?: { id?: number; rootPlaceId?: number }[];
    };
    const game = Array.isArray(body?.data)
      ? body.data.find((game) => String(game?.id) === universeId)
      : undefined;
    if (!game) throw new Error("Universe not found. Check your Universe ID.");
    const placeId = game.rootPlaceId;
    if (
      typeof placeId !== "number" ||
      !Number.isSafeInteger(placeId) ||
      placeId <= 0
    ) {
      throw new Error("Roblox did not return a valid game page.");
    }
    await open(`https://www.roblox.com/games/${placeId}`);
  });
}
