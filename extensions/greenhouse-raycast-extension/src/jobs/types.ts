export interface HarvestJob {
  id: number;
  name: string;
  status: "open" | "closed" | "draft" | string;
  confidential: boolean;
  requisition_id?: string | null;
}

export interface HarvestJobPost {
  id: number;
  title: string;
  job_id: number;
  active: boolean;
  live: boolean;
  internal: boolean;
  external: boolean;
}

export interface JobListItem {
  job_id: number;
  title: string;
  hasInternal: boolean;
  hasExternal: boolean;
  hasNoPosts: boolean;
}

export interface HarvestJobStage {
  id: number;
  name: string;
  job_id: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface HarvestApplicationStage {
  id: number;
  name: string;
}

export interface HarvestApplicationJob {
  id: number;
  name: string;
}

export interface HarvestApplication {
  id: number;
  candidate_id: number;
  applied_at: string;
  last_activity_at: string | null;
  current_stage: HarvestApplicationStage | null;
  status: string;
  jobs: HarvestApplicationJob[];
}

export interface HarvestCandidate {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}
