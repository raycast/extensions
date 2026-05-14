export type PromptSetId = 1 | 2 | 3;

export type PromptSetConfig = {
  id: PromptSetId;
  commandTitle: string;
  displayName: string;
  isEnabled: boolean;
  directory?: string;
};

export type ConfiguredPromptSet = PromptSetConfig & {
  directory: string;
};

export type PromptFile = {
  path: string;
  name: string;
  relativePath: string;
  promptSet: ConfiguredPromptSet;
  updatedAt: Date;
  size: number;
};

export type PromptSetLoadFailure = {
  promptSet: ConfiguredPromptSet;
  message: string;
};

export type PromptFileLoadResult = {
  files: PromptFile[];
  failures: PromptSetLoadFailure[];
};
