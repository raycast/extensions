import { MatchExtended } from "@zxcvbn-ts/core/dist/types";

export interface Utils {
  password: string;
  subtitle: string;
  strength: number;
  icon: string;
  accessoryTitle: string;
  sectionTitle: string;
  sequence: MatchExtended[];
}

export interface StoryListItemProps extends Utils {
  setShowingDetails: () => void;
  showingDetails: boolean;
}
