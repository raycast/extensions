import { ReviewCounts } from "./reviews";

export type CIStatus = "success" | "failure" | "pending" | "unknown";

export interface CIInfo {
  status: CIStatus;
  passing: number;
  failing: number;
  pending: number;
  failingNames: string[];
  total: number;
}

export interface PRExtraInfo {
  reviewCounts: ReviewCounts;
  mergeableState: string | null;
  ci: CIInfo;
}

export interface CheckRun {
  name: string;
  status: string;
  conclusion: string | null;
}

export interface CheckRunsResponse {
  total_count: number;
  check_runs: CheckRun[];
}
