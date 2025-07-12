export interface ExtensionConfig {
  [deviceId: string]: DeviceConfig;
}

export interface DeviceConfig {
  name: string;
  cliPath: string;
  projects: Project[];
}

export interface Project extends Record<string, unknown> {
  id: string;
  name: string;
  path: string;
  lastUsedAt?: number;
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
