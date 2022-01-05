import { Author, Icon } from "@models";

export interface ScriptCommand {
  authors?: Author[];
  createdAt: Date;
  currentDirectoryPath?: string;
  description?: string;
  filename: string;
  hasArguments: boolean;
  icon?: Icon;
  identifier: string;
  isTemplate: boolean;
  language: string;
  mode?: string;
  needsConfirmation?: boolean;
  packageName?: string;
  path: string;
  refreshTime?: string;
  schemaVersion: number;
  title: string;
  updatedAt: Date;
}
