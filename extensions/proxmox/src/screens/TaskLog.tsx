import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { PveServer, PveTask, PveTaskLogLine, PveTaskStatus } from "@/types";
import { usePveFetch } from "@/hooks/use-pve-fetch";
import { describeFetchError } from "@/utils/errors";
import { formatShortTime } from "@/utils/format";
import { getTaskTitle } from "@/utils/tasks";
import { getTaskStatusIcon } from "@/utils/ui";

/** Proxmox returns 50 lines unless asked for more */
const LOG_LINE_LIMIT = 5000;

type TaskLogProps = {
  server: PveServer;
  node: string;
  upid: string;
};

export const TaskLog = ({ server, node, upid }: TaskLogProps) => {
  const taskUrl = `api2/json/nodes/${node}/tasks/${encodeURIComponent(upid)}`;
  const [running, setRunning] = useState(true);
  const onError = (error: Error) => {
    setRunning(false);
    showFailureToast(error, { message: describeFetchError(error) });
  };
  const { data: status } = usePveFetch<PveTaskStatus & Pick<PveTask, "type" | "id" | "user" | "starttime">>(
    server,
    `${taskUrl}/status`,
    {
      timerInterval: running ? 1000 : null,
      onData: (data) => setRunning(data.status !== "stopped"),
      onError,
    },
  );
  const {
    data: lines,
    isLoading,
    revalidate: revalidateLog,
  } = usePveFetch<PveTaskLogLine[]>(server, `${taskUrl}/log?limit=${LOG_LINE_LIMIT}`, {
    timerInterval: running ? 1000 : null,
    onError,
  });

  // The last poll can land just before the task writes its final lines, so we read the log once more.
  useEffect(() => {
    if (!running) {
      revalidateLog();
    }
  }, [running]);

  const log = (lines ?? []).map((line) => line.t).join("\n");
  const exitStatus = running ? undefined : status?.exitstatus;
  const title = status ? getTaskTitle(status) : "Task";
  const duration = status ? formatShortTime(Math.round(Date.now() / 1000) - status.starttime) : undefined;

  return (
    <Detail
      isLoading={isLoading || running}
      navigationTitle={title}
      markdown={"```\n" + log + "\n```"}
      metadata={
        status && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={exitStatus ?? "running"} icon={getTaskStatusIcon(exitStatus)} />
            <Detail.Metadata.Label title="Task" text={title} />
            <Detail.Metadata.Label title="Node" text={node} />
            <Detail.Metadata.Label title="User" text={status.user} />
            <Detail.Metadata.Label title="Started" text={new Date(status.starttime * 1000).toLocaleString()} />
            {running && <Detail.Metadata.Label title="Running for" text={duration} />}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Log" content={log} />
          <Action.CopyToClipboard title="Copy UPID" content={upid} />
        </ActionPanel>
      }
    />
  );
};
