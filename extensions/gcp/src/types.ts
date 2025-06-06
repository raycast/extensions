export interface GCPInstance {
  id: string;
  name: string;
  zone: string;
  machineType: string;
  status: string;
  externalIp?: string;
  internalIp?: string;
  creationTimestamp: string;
}

export interface GCPCloudRunService {
  name: string;
  region: string;
  url: string;
  status: string;
  lastModified: string;
  image: string;
  traffic: Array<{
    revisionName: string;
    percent: number;
  }>;
}

export interface GCPStorageBucket {
  name: string;
  location: string;
  storageClass: string;
  created: string;
  updated: string;
  size?: string;
  objects?: number;
}

export interface GCPFunction {
  name: string;
  region: string;
  status: string;
  runtime: string;
  trigger: string;
  lastModified: string;
  sourceArchiveUrl?: string;
}

export interface GCPPreferences {
  projectId: string;
  serviceAccountPath?: string;
}
