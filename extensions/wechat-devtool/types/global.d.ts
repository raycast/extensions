import { REPOSITORY_TYPE } from "../src/constants";

export {};

declare global {
  interface ExtensionConfig {
    cliPath: string;
    projects: Project[];
  }

  interface Project {
    id: string;
    name: string;
    path: string;
    lastUsedAt: number;
    aliases: string[];
    repositoryType: RepositoryType;
  }

  type RepositoryType = (typeof REPOSITORY_TYPE)[keyof typeof REPOSITORY_TYPE];

  interface WechatProjectConfig {
    projectname?: string;
  }
}
