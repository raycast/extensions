import { closeMainWindow, open } from "@raycast/api";
import { run, settings } from "./utils";

async function gameName(placeId: string): Promise<string> {
  try {
    const signal = AbortSignal.timeout(3_000);
    const placeResponse = await fetch(
      `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
      { signal },
    );
    if (!placeResponse.ok) throw new Error("Place lookup failed");
    const place = (await placeResponse.json()) as { universeId?: number };
    if (!place.universeId) throw new Error("Universe not found");

    const gameResponse = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${place.universeId}`,
      { signal },
    );
    if (!gameResponse.ok) throw new Error("Game lookup failed");
    const games = (await gameResponse.json()) as {
      data?: { name?: string }[];
    };
    const name = games.data?.[0]?.name;
    if (typeof name === "string" && name.trim()) return name.trim();
  } catch {
    // A metadata outage must not prevent the game from launching.
  }
  return `place ${placeId}`;
}

export default async function Command() {
  await closeMainWindow();

  await run("Launching Roblox...", async (toast) => {
    const { placeId } = settings("placeId");
    const name = await gameName(placeId);
    toast.title = `Launching ${name}...`;
    await open(`roblox://experiences/start?placeId=${placeId}`);
    return `Launched ${name}`;
  });
}
