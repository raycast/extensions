import { List } from "@raycast/api";
import { useFetch, usePromise } from "@raycast/utils";
import { FC, useMemo } from "react";
import { Run, RunDetailInfo } from "../types";
import { YUNXIAO_HEADERS, DOMAIN, ORGANIZATION_ID } from "../constants";
import { extractLogErrors, formatDate } from "../utils";
import { fetchVMDeployResult, fetchVMLogs } from "../apis";

const MAX_LOG_LINES = 30;

export const RunDetail: FC<{
  run: Run;
  target: string;
  duration: string;
}> = ({ run, target, duration }) => {
  const { data: runInfo, isLoading: detailLoading } = useFetch<RunDetailInfo>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines/${run.pipelineId}/runs/${run.pipelineRunId}`,
    {
      headers: YUNXIAO_HEADERS,
    },
  );

  const { job, isFailed } = useMemo(() => {
    const stages = runInfo?.stages;

    const failedJob = stages
      ?.find((stage) => stage.stageInfo.status === "FAIL")
      ?.stageInfo.jobs.find((job) => job.status === "FAIL");

    if (failedJob) {
      return { job: failedJob, isFailed: true };
    }

    const lastJobs = stages?.findLast((stage) => !!stage.stageInfo.startTime)?.stageInfo.jobs;

    if (lastJobs) {
      return { job: lastJobs.findLast((job) => !!job.startTime), isFailed: false };
    }

    return { job: undefined, isFailed: false };
  }, [runInfo]);

  const logType = useMemo(() => {
    if (job?.actions?.find((action) => action.type === "LogPipelineJobRun")) {
      return "normal";
    } else if (job?.actions?.find((action) => action.type === "GetVMDeployOrder")) {
      return "vm";
    }

    return undefined;
  }, [job]);

  const {
    data: runLogs,
    error,
    isLoading: normalLogLoading,
  } = useFetch<{ content: string }>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines/${run.pipelineId}/runs/${run.pipelineRunId}/job/${job?.id}/log`,
    {
      headers: YUNXIAO_HEADERS,
      execute: logType === "normal",
    },
  );

  const {
    data: vmLogs,
    error: vmError,
    isLoading: vmLogLoading,
  } = usePromise(async () => {
    const deployOrderID = job?.actions?.find((action) => action.type === "GetVMDeployOrder")?.params.deployOrderId;

    if (!deployOrderID) {
      return;
    }

    const deployResult = await fetchVMDeployResult(run.pipelineId, deployOrderID);
    const machineSN = deployResult?.deployMachineInfo.deployMachines.find((item) => item.machineSn)?.machineSn;

    if (!machineSN) {
      return { deployLog: "No VM logs found" };
    }

    return fetchVMLogs(run.pipelineId, deployOrderID, machineSN);
  });

  const logLoading = useMemo(() => {
    if (logType === "normal") {
      return normalLogLoading;
    }

    if (logType === "vm") {
      return vmLogLoading;
    }

    return detailLoading;
  }, [logType, vmLogLoading, normalLogLoading, detailLoading]);

  const { triggerMessage, commitTitle } = useMemo(() => {
    const rawMessage = runInfo?.globalParams.find((item) => item.key === "BUILD_MESSAGE")?.value;
    const commitTitle = runInfo?.globalParams.find((item) => item.key === "CI_COMMIT_TITLE")?.value;

    // Process rawMessage to remove markdown links if present
    let processedMessage: string | undefined = rawMessage;
    if (rawMessage) {
      // Remove markdown links format [text](url) and keep only the text part
      processedMessage = rawMessage.replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ");
    }

    return {
      triggerMessage: processedMessage,
      commitTitle: commitTitle,
    };
  }, [runInfo]);

  const logs = useMemo(() => {
    if (logLoading) {
      return "```\nloading...\n```";
    }

    if (error || vmError) {
      return `Error fetching logs ${error?.message || vmError?.message}`;
    }

    let content = runLogs?.content || vmLogs?.deployLog || "empty log";

    if (isFailed) {
      content = extractLogErrors(content)?.[1];
    }

    let contentLines = content?.split("\n") ?? [];

    if (contentLines.length > MAX_LOG_LINES) {
      contentLines = contentLines.slice(-MAX_LOG_LINES);
      content = `... (showing last ${MAX_LOG_LINES} lines) ...\n` + contentLines.join("\n");
    }

    return "```log\n" + content + "\n```";
  }, [logLoading, error, runLogs, vmError, vmLogs, isFailed]);

  return (
    <List.Item.Detail
      isLoading={detailLoading}
      markdown={logs}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title="ID" text={`#${run.pipelineRunId}`} target={target} />
          <List.Item.Detail.Metadata.Label title="Trigger" text={triggerMessage} />
          <List.Item.Detail.Metadata.Label title="Commit" text={commitTitle} />
          <List.Item.Detail.Metadata.Label title="Start Time" text={formatDate(run.startTime)} />
          <List.Item.Detail.Metadata.Label title="End Time" text={formatDate(run.endTime)} />
          <List.Item.Detail.Metadata.Label title="Duration" text={duration} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
