export enum VersionType {
  channel = "channel",
  release = "release",
  commit = "commit",
  custom = "custom",
}

export interface CachedFlutterVersion {
  name: string;
  directory: string;
  releaseFromChannel: null;
  type: VersionType;
  binPath: string;
  hasOldBinPath: boolean;
  dartBinPath: string;
  dartExec: string;
  flutterExec: string;
  flutterSdkVersion: null | string;
  dartSdkVersion: null | string;
  isSetup: boolean;
}

export enum FlutterChannel {
  stable = "stable",
  beta = "beta",
  dev = "dev",
  master = "master",
}

export interface FlutterSdkRelease {
  // Release hash
  hash: string;

  // Release channel
  channel: FlutterChannel;

  // Release version
  version: string;

  // Release date
  release_date: Date;

  // Release archive name
  archive: string;

  // Release sha256 hash
  sha256: string;

  // Is release active in a channel
  active_channel: boolean;

  // Version of the Dart SDK (optional)
  dart_sdk_version?: string;

  // Dart SDK architecture (optional)
  dart_sdk_arch?: string;
}

export interface Channels {
  stable: FlutterSdkRelease;
  beta: FlutterSdkRelease;
}

export class FlutterReleasesResponse {
  constructor(
    public versions: FlutterSdkRelease[],
    public channels: Channels,
  ) {}

  static fromJson(json: string): FlutterReleasesResponse {
    return JSON.parse(json);
  }
}

export class VersionCacheResponse {
  constructor(
    public size: string,
    public versions: CachedFlutterVersion[],
  ) {}

  static fromJson(json: string): VersionCacheResponse {
    return JSON.parse(json);
  }
}

export class FvmContextResponse {
  constructor(
    public context: FvmContext,
    public fvmVersion: string,
  ) {}

  static fromJson(json: string): FvmContextResponse {
    return JSON.parse(json);
  }
}

export interface FvmContext {
  id: string;
  args: string[];
  workingDirectory: string;
  isTest: boolean;
  fvmVersion: string;
  fvmDir: string;
  gitCache: boolean;
  runPubGetOnSdkChanges: boolean;
  gitCachePath: string;
  flutterUrl: string;
  lastUpdateCheck: Date;
  updateCheckDisabled: boolean;
  priviledgedAccess: boolean;
  globalCacheLink: string;
  globalCacheBinPath: string;
  versionsCachePath: string;
  configPath: string;
  isCI: boolean;
}
