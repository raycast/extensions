import path from "path";
import { SpaceSettings } from "./spaceSettings";

export type SpaceSQLite = {
  path: string;
  spaceID: string;
  primary: boolean;
  customName: string | null;
  isEnabled: boolean;
};

type DiscoverSpacesParams = {
  dataRoot: string;
  searchPath: string;
  settings: SpaceSettings;
  readDirectory: (targetPath: string) => string[];
};

const uuidPattern = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/g;

export const discoverSpaces = ({
  dataRoot,
  searchPath,
  settings,
  readDirectory,
}: DiscoverSpacesParams): SpaceSQLite[] => {
  const realmSpaceIDs = new Set(
    readDirectory(dataRoot)
      .filter((entry) => entry.endsWith(".realm"))
      .map(extractSpaceIDFromRealmFilename)
      .filter((value): value is string => Boolean(value)),
  );

  return readDirectory(searchPath)
    .filter((entry) => entry.endsWith(".sqlite"))
    .filter((entry) => {
      const spaceID = extractSpaceIDFromSearchFilename(entry);

      if (!spaceID) {
        return false;
      }

      return realmSpaceIDs.size === 0 || realmSpaceIDs.has(spaceID);
    })
    .map((entry) => makeSpaceFromFilename(searchPath, entry, settings))
    .filter((entry): entry is SpaceSQLite => Boolean(entry));
};

export const extractSpaceIDFromRealmFilename = (filename: string): string | undefined => {
  const split = filename.split("_");

  if (split.length !== 3) {
    return;
  }

  return split[1].split("||").pop();
};

export const extractSpaceIDFromSearchFilename = (filename: string): string | undefined => {
  return filename.match(uuidPattern)?.pop();
};

const makeSpaceFromFilename = (
  directoryPath: string,
  filename: string,
  settings: SpaceSettings,
): SpaceSQLite | null => {
  const spaceID = extractSpaceIDFromSearchFilename(filename);

  if (!spaceID) {
    return null;
  }

  const spaceSettings = settings[spaceID];

  return {
    primary: !filename.includes("||"),
    path: path.join(directoryPath, filename),
    spaceID,
    customName: spaceSettings?.customName || null,
    isEnabled: spaceSettings?.isEnabled ?? true,
  };
};
