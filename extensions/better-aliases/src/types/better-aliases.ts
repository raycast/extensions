export interface BetterAliasItem {
  value: string;
  label?: string;
  snippetOnly?: boolean;
}

export interface BetterAliasesConfig {
  [alias: string]: BetterAliasItem;
}

// general preferences
export interface Preferences {
  leaderKeyConfigPath?: string;
  betterAliasesConfigPath?: string;
  hideAccessories?: boolean;
  snippetPrefix?: string;
  randomizedSnippetSeparator?: string;
  showFullAlias?: boolean;
}

// expand alias preferences
export interface ExpandAliasPreferences extends Preferences {
  showFullAlias: boolean;
}

// leader key preferences

// search alias preferences
