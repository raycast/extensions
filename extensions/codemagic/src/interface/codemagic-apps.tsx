export interface CodemagicApp {
  _id: string;
  projectType: string;
  appName: string;
  settingsSource: string | null;
  iconUrl: string;
  isConfigured: boolean | null;
  owner: string;
  repository: {
    htmlUrl: string;
    defaultBranch: string;
    owner: {
      name: string;
    };
  };
  branches: string[];
  lastBuildId: string | null;
  lastBuild?: {
    _id: string;
    status: string;
  } | null;
  workflows: {
    [key: string]: {
      _id: string;
      name: string;
    };
  };
}

export interface CodemagicAppResponse {
  applications: CodemagicApp[];
}
