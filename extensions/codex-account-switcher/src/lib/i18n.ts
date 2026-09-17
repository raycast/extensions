export type Copy = {
  locale: string;
  fiveHour: string;
  week: string;
  unknown: string;
  retry: string;
  tryAgain: string;
  addAccount: string;
  refresh: string;
  openExtensionPreferences: string;
  searchPlaceholder: string;
  unableToReadAccounts: string;
  unableToReadUsage: string;
  codexAuthRequired: string;
  codexAuthRequiredDescription: string;
  copyInstallCommand: string;
  installCommandCopied: string;
  openInstallationGuide: string;
  noSavedAccounts: string;
  noSavedAccountsDescription: string;
  accountAlreadyActive: string;
  switchingTo: (account: string) => string;
  switchedTo: (account: string) => string;
  restartCodexClient: string;
  switchFailed: string;
  openingCodexLogin: string;
  completeLoginInBrowser: string;
  accountAdded: string;
  newAccountIsActive: string;
  loginFailed: string;
  removeAccountTitle: (account: string) => string;
  removeLastActiveAccountMessage: string;
  removeActiveAccountMessage: string;
  removeAccountMessage: string;
  removeAccount: string;
  removingAccount: (account: string) => string;
  accountRemoved: string;
  activeAccountUpdated: string;
  removeFailed: string;
  currentAccount: string;
  switchToThisAccount: string;
  refreshUsage: string;
  copyEmail: string;
  remainingUsage: string;
  switchAccount: string;
  extensionPreferences: string;
  days: (count: number) => string;
  hours: (count: number) => string;
  resetTime: (value: string) => string;
  sourceRealtime: string;
  sourceLocal: string;
  sourceCache: string;
  sourceNone: string;
  missingAuthentication: string;
  refreshFailed: string;
  updateTimeUnknown: string;
  updatedAt: (value: string) => string;
  sourceAndUpdateTime: (source: string, updatedAt: string) => string;
  executableNotFoundAt: (filePath: string) => string;
  codexAuthNotFound: string;
  emptyOutput: string;
  invalidOutput: string;
  requestTimedOut: string;
  unsupportedVersion: string;
  processFailed: string;
  registryReadFailed: (filePath: string) => string;
  unsupportedRegistry: string;
  unsupportedSchema: string;
  accountNotFound: string;
  switchNotConfirmed: string;
  removalStateUnknown: string;
  removalNotConfirmed: string;
};

const english: Copy = {
  locale: "en-US",
  fiveHour: "5-hour",
  week: "Week",
  unknown: "Unknown",
  retry: "Retry",
  tryAgain: "Try again later",
  addAccount: "Add Account",
  refresh: "Refresh",
  openExtensionPreferences: "Open Extension Preferences",
  searchPlaceholder: "Search accounts, aliases, or workspaces",
  unableToReadAccounts: "Unable to Read Codex Accounts",
  unableToReadUsage: "Unable to read Codex usage.",
  codexAuthRequired: "codex-auth Is Required",
  codexAuthRequiredDescription: "Install codex-auth 0.3.0 or newer, then retry.",
  copyInstallCommand: "Copy Install Command",
  installCommandCopied: "Install command copied",
  openInstallationGuide: "Open Installation Guide",
  noSavedAccounts: "No Saved Accounts",
  noSavedAccountsDescription: "Sign in to Codex to add an account here.",
  accountAlreadyActive: "This account is already active",
  switchingTo: (account) => `Switching to ${account}`,
  switchedTo: (account) => `Switched to ${account}`,
  restartCodexClient: "Restart any running Codex client to apply the change",
  switchFailed: "Unable to Switch Account",
  openingCodexLogin: "Opening Codex Login",
  completeLoginInBrowser: "Complete the sign-in process in your browser",
  accountAdded: "Account Added",
  newAccountIsActive: "The new account is now active",
  loginFailed: "Unable to Sign In",
  removeAccountTitle: (account) => `Remove ${account}?`,
  removeLastActiveAccountMessage:
    "This is the last saved account and is currently active. Removing it will also remove the local Codex login.",
  removeActiveAccountMessage:
    "This account is currently active. After removal, codex-auth will select another saved account.",
  removeAccountMessage: "This account will be removed from codex-auth. This action cannot be undone.",
  removeAccount: "Remove Account",
  removingAccount: (account) => `Removing ${account}`,
  accountRemoved: "Account Removed",
  activeAccountUpdated: "The active Codex account has been updated",
  removeFailed: "Unable to Remove Account",
  currentAccount: "Current Account",
  switchToThisAccount: "Switch to This Account",
  refreshUsage: "Refresh Usage",
  copyEmail: "Copy Email",
  remainingUsage: "Remaining Usage",
  switchAccount: "Switch Account",
  extensionPreferences: "Extension Preferences",
  days: (count) => `${count} ${count === 1 ? "day" : "days"}`,
  hours: (count) => `${count} ${count === 1 ? "hour" : "hours"}`,
  resetTime: (value) => `Resets: ${value}`,
  sourceRealtime: "Current",
  sourceLocal: "Local Cache",
  sourceCache: "Cached",
  sourceNone: "Unavailable",
  missingAuthentication: "Authentication Missing",
  refreshFailed: "Refresh Failed",
  updateTimeUnknown: "Update Time Unknown",
  updatedAt: (value) => `Updated at ${value}`,
  sourceAndUpdateTime: (source, updatedAt) => `Source: ${source} · Updated: ${updatedAt}`,
  executableNotFoundAt: (filePath) => `Executable not found: ${filePath}`,
  codexAuthNotFound:
    "codex-auth was not found. Install version 0.3.0 or newer, or set its path in the extension preferences.",
  emptyOutput: "codex-auth returned no data.",
  invalidOutput: "Unable to read codex-auth output. Make sure version 0.3.0 or newer is installed.",
  requestTimedOut: "The codex-auth request timed out.",
  unsupportedVersion:
    "The installed codex-auth version does not support the JSON interface required by Raycast. Upgrade to version 0.3.0 or newer.",
  processFailed: "codex-auth failed.",
  registryReadFailed: (filePath) => `Unable to read ${filePath}`,
  unsupportedRegistry: "Unsupported codex-auth account registry format.",
  unsupportedSchema: "Unsupported codex-auth JSON format.",
  accountNotFound: "The account to switch to was not found.",
  switchNotConfirmed: "codex-auth did not confirm the account switch.",
  removalStateUnknown:
    "Unable to verify local state after removal. Refresh the account list before trying again.",
  removalNotConfirmed:
    "codex-auth did not confirm the removal. Refresh the account list before trying again.",
};

export function getCopy(): Copy {
  return english;
}
