type DisplayPlacerResolution = {
  mode?: number;
  res?: string;
  colorDepth?: string;
  hz?: string;
  scaling?: string;
  current?: boolean;
};
type DisplayPlacerScreen = {
  persistentId: string;
  resolutions: DisplayPlacerResolution[];
  contextualId?: string;
  type?: string;
  resolution?: string;
  hertz?: string;
  colorDepth?: string;
  scaling?: string;
  origin?: string;
  rotation?: string;
  mainDisplay?: boolean;
};
type DisplayPlacerList = {
  currentId?: string;
  // screens: DisplayPlacerScreen[];
  currentCommand: string | null;
};

type Favorite = {
  id: string;
  name: string;
  subtitle: string;
  command?: string;
};

interface Preferences {
  path?: string;
}
