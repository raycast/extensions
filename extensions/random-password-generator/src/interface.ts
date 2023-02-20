export interface PasswordOptions {
  name: string;
  isUpperCase: boolean;
  isLowerCase: boolean;
  isSymbol: boolean;
  isNumeric: boolean;
  isSegmented?: boolean;
}
export interface PasswordItem {
  password: string;
  options: PasswordOptions;
}

export interface StoryListItemProps extends PasswordItem {
  setShowingDetails: () => void;
  showingDetails: boolean;
  autoCalculateDetails: boolean;
  isFocused: boolean;
}
