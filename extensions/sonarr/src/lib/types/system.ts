export interface SystemStatus {
  version: string;
  buildTime?: string;
  isDebug?: boolean;
  isProduction?: boolean;
  isAdmin?: boolean;
  isUserInteractive?: boolean;
  startupPath?: string;
  appData?: string;
  osName?: string;
  osVersion?: string;
  isMonoRuntime?: boolean;
  isMono?: boolean;
  isLinux?: boolean;
  isOsx?: boolean;
  isWindows?: boolean;
  mode?: string;
  branch?: string;
  authentication?: string;
  sqliteVersion?: string;
  migrationVersion?: number;
  urlBase?: string;
  runtimeVersion?: string;
  runtimeName?: string;
  startTime?: string;
  packageVersion?: string;
  packageAuthor?: string;
  packageUpdateMechanism?: string;
  [key: string]: unknown;
}

export interface HealthCheck {
  source: string;
  type: HealthCheckType;
  message: string;
  wikiUrl?: string;
}

export enum HealthCheckType {
  Ok = "ok",
  Notice = "notice",
  Warning = "warning",
  Error = "error",
}

export interface Command {
  name: string;
  commandName: string;
  message?: string;
  body: CommandBody;
  priority: string;
  status: string;
  queued: string;
  started?: string;
  ended?: string;
  duration?: string;
  trigger: string;
  stateChangeTime?: string;
  sendUpdatesToClient: boolean;
  updateScheduledTask: boolean;
  lastExecutionTime?: string;
  id: number;
}

export interface CommandBody {
  sendUpdatesToClient?: boolean;
  updateScheduledTask?: boolean;
  completionMessage?: string;
  requiresDiskAccess?: boolean;
  isExclusive?: boolean;
  isTypeExclusive?: boolean;
  name?: string;
  lastExecutionTime?: string;
  lastStartTime?: string;
  trigger?: string;
  suppressMessages?: boolean;
  seriesId?: number;
  seasonNumber?: number;
  episodeIds?: number[];
}
