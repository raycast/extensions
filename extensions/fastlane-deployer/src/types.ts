export type Platform = "ios" | "android";

export type Shell = "zsh" | "bash" | "sh";

export type FastlaneLane = {
  id: string;
  name: string;
  platform: Platform;
  lane: string;
  command: string;
  environment?: string;
  isProduction?: boolean;
  expectedBranch?: string;
  requiredEnvVars?: string[];
};

export type FastlaneProject = {
  id: string;
  name: string;
  rootPath: string;
  workingDirectory: string;
  envFilePath?: string;
  shell: Shell;
  lanes: FastlaneLane[];
  createdAt: string;
  updatedAt: string;
};

export type DeploymentStatus = "running" | "success" | "failed" | "cancelled";

export type Deployment = {
  id: string;
  pid?: number;
  projectId: string;
  projectName: string;
  laneId: string;
  laneName: string;
  platform: Platform;
  command: string;
  status: DeploymentStatus;
  stage: string;
  progress: number;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number;
  signal?: string;
  logFilePath?: string;
  logs: string[];
  warnings: string[];
  errors: string[];
};
