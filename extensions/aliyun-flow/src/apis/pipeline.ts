import { DOMAIN, ORGANIZATION_ID } from "../constants";
import { DeployInfo, Run } from "../types";
import { fetchAliyunAPI } from "./base";

export async function fetchPipelineRuns(pipelineId: number) {
  return fetchAliyunAPI<Run[]>(`${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines/${pipelineId}/runs`);
}

export async function fetchVMDeployResult(pipelineId: number, deployOrderID: number) {
  return fetchAliyunAPI<DeployInfo>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines/${pipelineId}/deploy/${deployOrderID}`,
  );
}

export async function fetchVMLogs(pipelineId: number, deployOrderID: number, machineSN: string) {
  return fetchAliyunAPI<{ deployLog: string }>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines/${pipelineId}/deploy/${deployOrderID}/machine/${machineSN}/log`,
  );
}
