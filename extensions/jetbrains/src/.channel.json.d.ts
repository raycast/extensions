// JSON structure for entries in ~/Library/Application Support/JetBrains/Toolbox/channels/*.json
export interface Extension {
  type: string;
  defaultConfigDirectories: {
    ["idea.config.path"]: string;
  };
  baseName: string;
  name: string;
}
export interface Tool {
  toolId: string;
  toolName: string;
  versionName: string;
  buildNumber: string;
  launchCommand: string;
  extensions: Extension[];
}

interface ChannelDetail {
  installationDirectory: string;
}

export default interface Channel {
  channel: ChannelDetail;
  tool: Tool;
}
