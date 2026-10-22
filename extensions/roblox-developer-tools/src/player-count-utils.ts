export async function fetchPlayerCount(universeId: string) {
  const response = await fetch(
    `https://games.roblox.com/v1/games?universeIds=${universeId}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Roblox rate limit reached. Retrying on the next refresh."
        : `Unable to load player count (Roblox ${response.status}).`,
    );
  }

  const body = (await response.json()) as {
    data?: { id?: number; name?: string; playing?: number }[];
  };
  if (!Array.isArray(body?.data)) {
    throw new Error("Roblox returned an invalid player count response.");
  }
  const game = body.data.find((game) => String(game?.id) === universeId);
  if (!game) throw new Error("Universe not found. Check your Universe ID.");
  if (
    typeof game.playing !== "number" ||
    !Number.isSafeInteger(game.playing) ||
    game.playing < 0
  ) {
    throw new Error("Roblox did not return a valid player count.");
  }
  return {
    name: typeof game.name === "string" ? game.name : `Universe ${universeId}`,
    playing: game.playing,
  };
}
