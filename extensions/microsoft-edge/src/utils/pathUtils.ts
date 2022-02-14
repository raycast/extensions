import path from "path";

export const userDataDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  // * NOTE: You can find this under "Profile path" by visiting edge://version in Edge.
  return path.join(process.env.HOME, "Library", "Application Support", "Microsoft Edge");
};

export const historyDbPath = (profileName: string) => path.join(userDataDirectoryPath(), profileName, "History");

export const collectionsDbPath = (profileName: string) =>
  path.join(userDataDirectoryPath(), profileName, "Collections", "collectionsSQLite");

export const bookmarksFilePath = (profileName: string) => path.join(userDataDirectoryPath(), profileName, "Bookmarks");

export const getProfileName = () => "Default";
