import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { FC, useMemo } from "react";
import { Run, RunDetailInfo } from "../types";
import { CODEUP_HEADERS, DOMAIN, ORGANIZATION_ID } from "../constants";
import { extractLogErrors, formatDate } from "../utils";

export const RunDetail: FC<{
  run: Run;
  target: string;
  duration: string;
}> = ({ run, target, duration }) => {
  const { data: runInfo, isLoading } = useFetch<RunDetailInfo>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines/${run.pipelineId}/runs/${run.pipelineRunId}`,
    {
      headers: CODEUP_HEADERS,
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

    const jobs = stages?.[stages?.length - 1].stageInfo.jobs;

    if (jobs) {
      return { job: jobs[jobs.length - 1], isFailed: false };
    }

    return { job: undefined, isFailed: false };
  }, [runInfo]);

  const {
    data: runLogs,
    error,
    isLoading: logLoading,
  } = useFetch<{ content: string }>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines/${run.pipelineId}/runs/${run.pipelineRunId}/job/${job?.id}/log`,
    {
      headers: CODEUP_HEADERS,
      execute: !!job,
    },
  );

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

  const logDetail = useMemo(() => {
    if (logLoading) {
      return "```\nloading...\n```";
    }

    if (error) {
      return `Error fetching logs ${error.message}`;
    }

    let content = runLogs?.content ?? "loading...";

    if (isFailed) {
      content = extractLogErrors(content)[1];
    }

    let contentLines = content?.split("\n") ?? [];

    if (contentLines.length > 30) {
      contentLines = contentLines.slice(-30);
      content = "... (showing last 30 lines) ...\n" + contentLines.join("\n");
    }

    return "```log\n" + content + "\n```";
  }, [logLoading, error, runLogs]);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={logDetail}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title={`ID`} text={`#${run.pipelineRunId}`} target={target} />
          <List.Item.Detail.Metadata.Label title={`Trigger`} text={triggerMessage} />
          <List.Item.Detail.Metadata.Label title={`Commit`} text={commitTitle} />
          <List.Item.Detail.Metadata.Label title={`Start Time`} text={formatDate(run.startTime)} />
          <List.Item.Detail.Metadata.Label title={`End Time`} text={formatDate(run.endTime)} />
          <List.Item.Detail.Metadata.Label title={`Duration`} text={duration} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
