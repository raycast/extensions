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
}

export interface WechatProjectConfig {
  projectname?: string;
}
