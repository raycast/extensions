import { SpaceSQLite } from "./craftSpaces";

export const getPrimarySpace = (spaces: SpaceSQLite[]): SpaceSQLite | null => {
  return spaces.find((space) => space.primary) || spaces[0] || null;
};

export const getEnabledSpaces = (spaces: SpaceSQLite[]): SpaceSQLite[] => {
  return spaces.filter((space) => space.isEnabled);
};

export const getSpaceDisplayName = (spaces: SpaceSQLite[], spaceID: string): string => {
  const space = spaces.find((entry) => entry.spaceID === spaceID);

  if (!space) {
    return spaceID;
  }

  const displayName = space.customName || space.spaceID;

  return space.primary ? `${displayName} (Primary)` : displayName;
};

export const getSpacesForDropdown = (spaces: SpaceSQLite[]): Array<{ id: string; title: string }> => {
  return getEnabledSpaces(spaces).map((space) => ({
    id: space.spaceID,
    title: getSpaceDisplayName(spaces, space.spaceID),
  }));
};
