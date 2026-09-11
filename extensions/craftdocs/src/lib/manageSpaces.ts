import { SpaceSQLite } from "./craftSpaces";

export const shouldShowSpaceIdTutorial = ({
  hasSeenTutorial,
  spacesCount,
}: {
  hasSeenTutorial: boolean;
  spacesCount: number;
}) => {
  return !hasSeenTutorial && spacesCount > 0;
};

export const canToggleSpaceEnabled = ({
  space,
  currentlyEnabled,
}: {
  space: SpaceSQLite;
  currentlyEnabled: boolean;
}) => {
  return !(space.primary && currentlyEnabled);
};
