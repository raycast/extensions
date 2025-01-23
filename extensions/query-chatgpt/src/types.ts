export type TabOpenerArguments = {
  browserName: string;
  prompt: string;
  gptUrl: string;
  query: string;
};

export type ComposeAppleScriptArguments = Pick<TabOpenerArguments, "browserName" | "prompt"> & {
  urlToOpen: TabOpenerArguments["gptUrl"];
  urlToSearch: TabOpenerArguments["gptUrl"];
};

export type CustomCommandCreateConfigurationParams = {
  prompt: TabOpenerArguments["prompt"];
  gptUrl: TabOpenerArguments["gptUrl"];
  withCustomQuery: boolean;
};

export type ExecuteCustomCommand = {
  fallbackText?: string;
  arguments: {
    prompt: TabOpenerArguments["prompt"];
    gptUrl: TabOpenerArguments["gptUrl"];
    query: TabOpenerArguments["query"];
  };
  launchType: string;
  launchContext?: string;
};
