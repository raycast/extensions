import { Action, Icon, LocalStorage } from "@raycast/api";
import { File } from "../types";

const FAVOURITE_FILES_KEY = "favourite-files";
export const FAVOURITE_FILES_LIMIT = 5;

export async function loadFavouriteFiles() {
  const item = await LocalStorage.getItem<string>(FAVOURITE_FILES_KEY);
  if (item) {
    const parsed = JSON.parse(item) as File[];
    return parsed;
  } else {
    return [];
  }
}

export async function saveFavouriteFiles(file: File) {
  const item = await LocalStorage.getItem<string>(FAVOURITE_FILES_KEY);
  let parsedFiles: File[] = [];
  if (item) {
    parsedFiles = JSON.parse(item) as File[];
  }
  parsedFiles.push(file);
  const data = JSON.stringify(parsedFiles);
  await LocalStorage.setItem(FAVOURITE_FILES_KEY, data);
}

export async function clearFavouriteFiles() {
  return await LocalStorage.removeItem(FAVOURITE_FILES_KEY);
}

export function FavouriteFileAction(props: { file: File; isStarred: boolean }) {
  const { file } = props;
  return (
    <Action
      title={props.isStarred == false ? "Favourite this file" : "Unfavourite this file"}
      icon={props.isStarred ? Icon.StarDisabled : Icon.Star}
      onAction={() => saveFavouriteFiles(file)}
    />
  );
}
