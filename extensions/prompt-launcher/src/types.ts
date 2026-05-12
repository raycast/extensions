import type { Application } from "@raycast/api";

export type PromptSetId = 1 | 2 | 3;

export type ExtensionPreferences = {
  folder1Enabled?: boolean;
  folder1Directory?: string;
  folder1DisplayName?: string;
  folder2Enabled?: boolean;
  folder2Directory?: string;
  folder2DisplayName?: string;
  folder3Enabled?: boolean;
  folder3Directory?: string;
  folder3DisplayName?: string;
  editor?: Application;
  previewLineCount?: string;
  previewMaxCharacters?: string;
};

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
