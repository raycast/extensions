import { ActionPanel, Detail, Action, LocalStorage, Icon } from "@raycast/api";

import { useState, useRef } from "react";
import fetch from "node-fetch";
import { WorkspaceConfig } from "../types";

type ResultMaybe = {
  completed: boolean;
  result: object | string;
};

export function FormResult({ path, jobId, workspace }: { path: string; jobId: string; workspace: WorkspaceConfig }) {
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [markdown, setMarkdown] = useState("");

  if (error || !jobId) {
    return <Detail markdown="An error occurred." />;
  }

  const jobUrl = `${workspace.remoteURL}run/${jobId}`;
  const localMarkdown = `## Job URL: [Job ${jobId}](${jobUrl})`;
  const combinedMarkdowns = markdown || localMarkdown;

  const startPolling = () => {
    let times = 0;

    setIsLoading(true);
    setMarkdown(`⌛ Polling for results...`);

    const poll = () => {
      times++;
      setMarkdown(`⌛ Polled ${times} times...`);

      fetch(`${workspace.remoteURL}api/w/${workspace.workspaceId}/jobs_u/completed/get_result_maybe/${jobId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${workspace.workspaceToken}`,
        },
      })
        .then((response) => response.json() as Promise<ResultMaybe>)
        .then((data) => {
          if (data.completed) {
            // if data.result is string
            if (typeof data.result === "string") {
              setMarkdown(`## Job URL: [Job ${jobId}](${jobUrl})\n\n${data.result}`);
            } else {
              setMarkdown(
                `## Job URL: [Job ${jobId}](${jobUrl})\n\n\`\`\`json\n${JSON.stringify(data.result, null, 2)}\n\`\`\``
              );
            }

            if (intervalIdRef.current) {
              clearInterval(intervalIdRef.current);
              intervalIdRef.current = null;
            }
            setIsLoading(false);
          }
        })
        .catch((error) => {
          setError(error.message);
          setIsLoading(false);
        });
    };

    intervalIdRef.current = setInterval(poll, 2000);
    poll();
  };

  // flow by path, with latest run
  const time = new Date().getTime();
  LocalStorage.setItem(`${path}:last_exec_time`, time);

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Job" url={jobUrl} />
          <Action title="Poll Result" icon={Icon.RotateAntiClockwise} onAction={startPolling} />
          <Action.OpenInBrowser title="Open Past Runs" url={`${workspace.remoteURL}runs/${path}`} />
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={combinedMarkdowns}
    />
  );
}
