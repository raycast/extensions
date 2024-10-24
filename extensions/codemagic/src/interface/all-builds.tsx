export interface Application {
  _id: string;
  appName: string;
  iconUrl: string;
  repository: { htmlUrl: string };
}

export interface Build {
  _id: string;
  appId: string;
  status: string;
  version: string;
  branch: string;
  startedAt: string;
  finishedAt: string;
  artefacts: { name: string; type: string; url: string; size: number }[];
  commit: {
    authorAvatarUrl: string;
    authorEmail: string;
    authorName: string;
    commitMessage: string;
    url: string;
  };
  config: {
    name: string;
    buildSettings: {
      flutterMode: string;
      flutterVersion: string;
      platforms: string[];
      xcodeVersion: string;
    };
  };
}

export interface GroupedAppBuilds {
  app: Application;
  builds: Build[];
}

export interface FetchAllBuildsApiResponse {
  applications: Application[];
  builds: Build[];
}
