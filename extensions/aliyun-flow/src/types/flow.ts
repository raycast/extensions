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
  groupId: number; // 0 means no group
  envName: string | null;
  envId: string | null;
  tagList: null;
  pipelineConfigId: null;
  creator: Creator;
  modifier: null;
}

export interface PipelineGroup {
  name: string;
  id: number;
}

export type Status = "SUCCESS" | "FAIL" | "RUNNING" | "CANCELED" | "WAITING";

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

export type StatusFilter = "ALL" | Status;

export interface RunDetailInfo {
  globalParams: {
    key: "BUILD_MESSAGE" | "CI_COMMIT_TITLE";
    value: string;
  }[];
  stages: {
    name: string;
    stageInfo: {
      status: string;
      jobs: {
        id: number;
        status: string;
        startTime: number | null;
        endTime: number | null;
        actions:
          | (
              | {
                  type: "GetVMDeployOrder";
                  params: {
                    deployOrderId: number | null;
                  };
                }
              | {
                  type: "LogPipelineJobRun";
                  params: null;
                }
            )[]
          | null;
      }[];
      startTime: number | null;
      endTime: number | null;
    };
  }[];
}

export interface DeployInfo {
  deployOrderId: number;
  createTime: number;
  updateTime: number;
  creator: string;
  currentBatch: number;
  totalBatch: number;
  status: string;
  exceptionCode: string | null;
  deployMachineInfo: {
    hostGroupId: number;
    batchNum: number;
    deployMachines: {
      createTime: number;
      updateTime: number;
      status: string;
      machineSn: string;
      clientStatus: string;
      ip: string;
      batchNum: number;
      actions: {
        type: string;
        displayType: string;
        data: unknown | null;
        disable: boolean;
        params: {
          machineSn: string;
        };
        name: string;
        title: string | null;
        order: number;
      }[];
      machineOsArch: string;
      hostName: string;
    }[];
  };
  actions: never[];
}
