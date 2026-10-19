export interface ExtensionPreferences {
  cliPath?: string;
}

export const CLI_BINARY_NAME = "pods-control";

export const CLI_SEARCH_PATHS = [`/opt/homebrew/bin/${CLI_BINARY_NAME}`, `/usr/local/bin/${CLI_BINARY_NAME}`];
