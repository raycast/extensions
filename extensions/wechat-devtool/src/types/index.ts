import { REPOSITORY_TYPE } from "../constants";

export interface ExtensionConfig {
  cliPath: string;
  projects: Project[];
}

export interface Project {
  id: string;
  name: string;
  path: string;
  lastUsedAt: number;
  aliases: string[];
  repositoryType: RepositoryType;
}

export type RepositoryType = (typeof REPOSITORY_TYPE)[keyof typeof REPOSITORY_TYPE];

export interface WechatProjectConfig {
  projectname?: string;
}

export type ProjectExtraInfo = {
  branch: string | null;
  displayPath: string;
};
