import { MatchExtended } from "@zxcvbn-ts/core/dist/types";

export interface PasswordOptions {
  name: string;
  isUpperCase: boolean;
  isLowerCase: boolean;
  isSymbol: boolean;
  isNumeric: boolean;
  isSegmented?: boolean;
}
export interface PasswordDetails {
  crackTime: string;
  score: number;
  warning: string;
  suggestions: string[];
  sequence: MatchExtended[];
}
export interface PasswordItem {
  password: string;
  options: PasswordOptions;
}

export interface StoryListItemProps extends PasswordItem {
  setShowingDetails: () => void;
  showingDetails: boolean;
}
