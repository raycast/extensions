export interface Creator {
  id: string;
  username: string | null;
}

export interface Pipeline {
  name: string;
  owner: null;
  pipelineConfig: null;
  id: number;
  createTime: number;
  modifierAccountId: string | null;
  creatorAccountId: string;
  updateTime: number | null;
  groupId: number;
  envName: string | null;
  envId: string | null;
  tagList: null;
  pipelineConfigId: null;
  creator: Creator;
  modifier: null;
}

export type Status = "SUCCESS" | "FAIL" | "RUNNING" | "CANCELED";

export interface Run {
  status: Status;
  startTime: number;
  triggerMode: number;
  pipelineRunId: number;
  pipelineId: number;
  endTime: number;
  creator: null;
  creatorAccountId: string;
}

export interface RunDetailInfo {
  globalParams: {
    key: "BUILD_MESSAGE" | "CI_COMMIT_TITLE";
    value: string;
  }[];
  stages: {
    name: string;
    stageInfo: {
      status: string;
      jobs: { id: number; status: string }[];
    };
  }[];
}
