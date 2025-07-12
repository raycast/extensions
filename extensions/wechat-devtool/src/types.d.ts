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
  appid?: string;
  miniprogramRoot?: string;
  qcloudRoot?: string;
  pluginRoot?: string;
  cloudbaseRoot?: string;
  cloudfunctionRoot?: string;
  cloudfunctionTemplateRoot?: string;
  cloudcontainerRoot?: string;
  compileType?: string;
  setting?: Record<string, unknown>;
  libVersion?: string;
  packOptions?: Record<string, unknown>;
  debugOptions?: Record<string, unknown>;
  watchOptions?: Record<string, unknown>;
  scripts?: Record<string, unknown>;
  staticServerOptions?: Record<string, unknown>;
  editorSetting?: Record<string, unknown>;
  skeletonConfig?: Record<string, unknown>;
}
