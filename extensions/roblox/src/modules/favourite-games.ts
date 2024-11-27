import { LocalStorage, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export const MAX_FAVOURITE_GAMES = 20;

export async function getFaviouriteGames(): Promise<number[]> {
  const favourite_games_json = await LocalStorage.getItem("favourite_games");
  if (favourite_games_json && typeof favourite_games_json == "string") {
    try {
      const favourite_games = JSON.parse(favourite_games_json);
      return favourite_games;
    } catch (error) {
      return [];
    }
  }
  return [];
}

export async function addGameToFavourites(gameId: number) {
  const current_favourite_games = await getFaviouriteGames();

  if (current_favourite_games.length >= MAX_FAVOURITE_GAMES) {
    showFailureToast("Too many favourites!");
    return false;
  }
  if (current_favourite_games.includes(gameId)) {
    showFailureToast("Already added!");
    return false;
  }

  current_favourite_games.push(gameId);
  await LocalStorage.setItem("favourite_games", JSON.stringify(current_favourite_games));

  showToast({
    title: "Success",
    message: "Added to favourites!",
  });
  return true;
}

export async function removeGameFromFavourites(gameId: number) {
  const current_favourite_games = await getFaviouriteGames();

  if (!current_favourite_games.includes(gameId)) {
    showFailureToast("Not added!");
    return false;
  }

  const updated_favourite_games = current_favourite_games.filter((id) => id !== gameId);
  await LocalStorage.setItem("favourite_games", JSON.stringify(updated_favourite_games));

  showToast({
    title: "Success",
    message: "Removed from favourites!",
  });
  return true;
}

export async function moveFavouriteGameUp(gameId: number) {
  const current_favourite_games = await getFaviouriteGames();
  const index = current_favourite_games.indexOf(gameId);

  if (index === -1) {
    showFailureToast("Game not in favorites!");
    return false;
  }

  if (index === 0) {
    showFailureToast("Game already at the top!");
    return false;
  }

  // Swap the game with the one above it
  [current_favourite_games[index - 1], current_favourite_games[index]] = [
    current_favourite_games[index],
    current_favourite_games[index - 1],
  ];

  await LocalStorage.setItem("favourite_games", JSON.stringify(current_favourite_games));

  showToast({
    title: "Success",
    message: "Game moved up!",
  });
  return true;
}

export async function moveFavouriteGameDown(gameId: number) {
  const current_favourite_games = await getFaviouriteGames();
  const index = current_favourite_games.indexOf(gameId);

  if (index === -1) {
    showFailureToast("Game not in favorites!");
    return false;
  }

  if (index === current_favourite_games.length - 1) {
    showFailureToast("Game already at the bottom!");
    return false;
  }

  // Swap the game with the one below it
  [current_favourite_games[index], current_favourite_games[index + 1]] = [
    current_favourite_games[index + 1],
    current_favourite_games[index],
  ];

  await LocalStorage.setItem("favourite_games", JSON.stringify(current_favourite_games));

  showToast({
    title: "Success",
    message: "Game moved down!",
  });
  return true;
}
