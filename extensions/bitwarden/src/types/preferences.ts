export type TransientCopyPreferences = {
  transientCopySearch: "always" | "passwords" | "never";
  transientCopyGeneratePassword: "always" | "never";
  transientCopyGeneratePasswordQuick: "always" | "never";
};

export type Preferences = {
  cliPath: string;
  clientId: string;
  clientSecret: string;
  fetchFavicons: boolean;
  serverUrl: string;
  serverCertsPath: string;
  repromptIgnoreDuration: string;
  generatePasswordQuickAction: "paste" | "copy" | "copyAndPaste";
  shouldCacheVaultItems: boolean;
  windowActionOnCopy: "keepOpen" | "close" | "closeAndPopToRoot";
} & TransientCopyPreferences;
