// JSON structure for entries in ~/Library/Application Support/JetBrains/Toolbox/channels/*.json
export interface Extension {
  type: string;
  defaultConfigDirectories: {
    ["idea.config.path"]: string;
  };
  baseName: string;
  name: string;
}

export interface intelliJProperties {
  directoryPatterns: string[];
  recentProjectsFilenames: string[];
}
export interface Tool {
  toolId: string;
  toolName: string;
  versionName: string;
  buildNumber: string;
  launchCommand: string;
  extensions: Extension[];
}

export interface ChannelDetail {
  installationDirectory: string;
  history: History;
}

interface ToolBuild {
  tool: {
    intelliJProperties?: intelliJProperties;
  };
}
interface History {
  toolBuilds: ToolBuild[];
}
export default interface Channel {
  channel?: ChannelDetail;
  tool?: Tool;
  channelId: string;
}
