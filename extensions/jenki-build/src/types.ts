// src/types.ts — Single source of truth for all shared types

/** Jenkins job status after normalization from raw color field */
export type JobStatus =
  | "running"
  | "success"
  | "failure"
  | "aborted"
  | "disabled";

/** Last build summary included in leaf-level job data */
export interface LastBuild {
  number: number;
  timestamp: number;
  result: "SUCCESS" | "FAILURE" | "ABORTED" | "NOT_BUILT" | null;
}

/** Jenkins parameter definition type discriminator */
export type JenkinsParamType =
  | "StringParameterDefinition"
  | "BooleanParameterDefinition"
  | "ChoiceParameterDefinition"
  | "PasswordParameterDefinition";

/** Normalized build parameter for UI rendering */
export interface BuildParameter {
  name: string;
  type: JenkinsParamType;
  description?: string;
  defaultValue?: string | boolean;
  choices?: string[];
}

/** Raw node shape returned by Jenkins REST API tree query */
export interface RawJenkinsNode {
  name: string;
  url: string;
  color?: string;
  _class?: string;
  jobs?: RawJenkinsNode[];
  lastBuild?: { number: number; timestamp: number; result: string | null };
}

/** Response shape from Jenkins /api/json?tree=jobs[...] */
export interface RawJobsResponse {
  jobs: RawJenkinsNode[];
}

/** Normalized, flattened job ready for UI consumption */
export interface JenkinsJob {
  name: string;
  url: string;
  path: string;
  status: JobStatus;
  _class?: string;
  lastBuild?: LastBuild;
}

/** Entry in the recent-jobs LocalStorage slot */
export interface RecentJob {
  path: string;
  timestamp: number;
}

/** Entry in the build-history LocalStorage slot */
export interface BuildHistoryEntry {
  jobName: string;
  jobPath: string;
  jobUrl: string;
  buildNumber: number;
  triggeredAt: number;
  status: JobStatus;
}

/** Raycast extension preferences shape */
export interface ExtensionPreferences {
  jenkinsUrl: string;
  username: string;
  apiToken: string;
  defaultJobPath?: string;
}
