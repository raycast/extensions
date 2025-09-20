import { LocalStorage } from "@raycast/api";
import { favoriteActionsPersistKey } from "../find-latest-actions";
import { getLatestActions } from "./get-latest-actions";

export async function getFavoriteActions(withInputOnly?: boolean) {
  const savedFavorites = await LocalStorage.getItem<string>(favoriteActionsPersistKey);
  const favoriteMap = savedFavorites ? new Map(JSON.parse(savedFavorites)) : new Map();

  const allActions = await getLatestActions();

  const favoriteActions = allActions.filter((action) => {
    if (!favoriteMap.has(action.uuid)) {
      return false;
    } else if (withInputOnly) {
      return favoriteMap.get(action.uuid) === withInputOnly;
    } else {
      return true;
    }
  });

  return favoriteActions;
}
