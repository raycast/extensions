import path from "path";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = () => {
  const userDataDirectory = userLibraryDirectoryPath();
  return path.join(userDataDirectory, "Application Support", "Iridium", "Default", "History");
};
