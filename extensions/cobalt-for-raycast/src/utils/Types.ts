export type FormValues = {
  url: string;
  downloadMode: string;
  instance: string;
};

export type CobaltInstance = {
  version: string;
  url: string;
  startTime: string;
  services: string[];
};

export type GitInstance = {
  branch: string;
  commit: string;
  remote: string;
};

export type Instance = {
  id: string;
  cobalt?: CobaltInstance; // ici cobalt est typé précisément
  git?: GitInstance;
  name: string;
  url: string;
  apiKey?: string;
  frontendUrl?: string;
};

export type instanceMetadata = {
  cobalt: object;
  git: object;
};

export type metadataCobalt = {
  version: string;
  url: string;
  startTime: string;
  services: string[];
};

export type metadataGit = {
  branch: string;
  commit: string;
  remote: string;
};
