export type ScriptArgumentData = {
  title: string;
  value: string;
};

export type ScriptArgument = {
  type?: string;
  placeholder?: string;
  optional?: boolean;
  percentEncoded?: boolean;
  secure?: boolean;
  data?: ScriptArgumentData[];
};

export type ScriptCommand = {
  path: string;
  directory: string;
  filename: string;
  deeplinkId: string;
  deeplink: string;
  body: string;
  isExecutable: boolean;
  schemaVersion: string;
  title: string;
  mode?: string;
  packageName?: string;
  icon?: string;
  iconDark?: string;
  currentDirectoryPath?: string;
  needsConfirmation?: boolean;
  refreshTime?: string;
  author?: string;
  authorURL?: string;
  description?: string;
  argumentsList: ScriptArgument[];
};

export type DirectoryError = {
  directory: string;
  message: string;
};

export type DiscoveryResult = {
  commands: ScriptCommand[];
  errors: DirectoryError[];
};
