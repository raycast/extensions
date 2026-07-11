export interface GearsetPreferences {
  apiToken?: string;
  reportingApiToken?: string;
  auditApiToken?: string;
  ciJobs?: string;
  pipelineId?: string;
  historyDays: string;
  historyLimit: string;
  deploymentHistoryDays: string;
}

export type GearsetApiKind = "automation" | "reporting" | "audit";

export type GearsetEnvironment = "production" | "sandbox";

export interface ConfiguredCiJob {
  name: string;
  id: string;
  environment: GearsetEnvironment;
}

export type CiJobState = "Idle" | "Running";

export interface CiJobStatus {
  State: CiJobState;
}

export interface RunRequestResponse {
  RunRequestId: string;
}

export type CiRunState = "Pending" | "Started" | "Succeeded" | "Partial" | "Failed";

export interface CiRunStatus {
  State: CiRunState;
  RunId?: string;
  StartDateTime?: string;
  EndDateTime?: string;
}

export interface RunHistoryEntry {
  id: string;
  timestamp: string;
  jobId: string;
  jobName: string;
  environment: GearsetEnvironment;
  runRequestId: string;
  state: CiRunState;
  runId?: string;
  startDateTime?: string;
  endDateTime?: string;
  sourceGitCommitId?: string;
}

export interface PipelineEnvironment {
  EnvironmentId?: string | null;
  Name?: string | null;
  CiJobId?: string | null;
  CiJobType?: "Deployment" | "Validation";
  IsJobEnabled?: boolean;
  TargetOrgLocationType?: string;
  TargetOrgName?: string | null;
  TargetOrgUrl?: string | null;
  TargetOrgId?: string | null;
  Stage?: "Integration" | "Release" | "Production";
}

export interface PipelineDeployment {
  DeploymentId?: string | null;
  Status?: "Successful" | "Failed" | "PartiallySuccessful";
  Date?: string;
  TargetMetadataLocationType?: string;
  PipelineId?: string | null;
  PipelineEnvironmentId?: string | null;
  SalesforceFinalDeploymentId?: string | null;
  MetadataItemsInDeploymentCount?: number;
  VlocityItemsInDeploymentCount?: number;
  ConfigDataItemsInDeploymentCount?: number;
  ReportedBugs?: unknown[] | null;
  DeploymentPullRequests?: unknown[] | null;
  [key: string]: unknown;
}

export interface PipelineDeploymentResult {
  Deployments: PipelineDeployment[];
}

export interface OperationAccepted {
  Status: "Running" | "Succeeded" | "Failed";
  OperationStatusId: string;
}

export interface OperationStatus {
  Status: "Running" | "Succeeded" | "Failed";
  OperationResultId?: string | null;
  Error?: string | null;
}

export interface DeploymentAuditDifference {
  DifferenceType: string;
  ObjectType: string;
  DisplayName: string;
  ModifiedBy: string;
  ModifiedOn: string;
}

export interface DeploymentAuditEntry {
  DeploymentId: string;
  Status: "Successful" | "Failed" | "PartiallySuccessful";
  Name: string;
  Owner: string;
  TriggeredBy: string;
  Date: string;
  FriendlyName: string;
  SourceUsername: string;
  SourceMetadataLocationType: string;
  TargetUsername: string;
  TargetMetadataLocationType: string;
  DeploymentType: string;
  DeploymentDifferences: DeploymentAuditDifference[];
  DeploymentDifferenceCount?: number;
  SalesforceFinalDeploymentId?: string | null;
  JiraTickets?: unknown[] | null;
  AsanaTasks?: unknown[] | null;
  AzureDevOpsWorkItems?: unknown[] | null;
  PullRequests?: unknown[] | null;
  [key: string]: unknown;
}

export interface DeploymentAuditResponse {
  Deployments: DeploymentAuditEntry[];
}

export type AuditReportKind =
  | "deployments"
  | "ci-runs"
  | "ci-edits"
  | "pipeline-edits"
  | "gearset-permissions"
  | "role-changes"
  | "delegations"
  | "delegated-org-usage"
  | "pipeline-permissions"
  | "ci-job-permissions"
  | "connected-services";

export interface AuditReportRequest {
  kind: AuditReportKind;
  startDate: Date;
  endDate: Date;
  jobId?: string;
  pipelineId?: string;
}
