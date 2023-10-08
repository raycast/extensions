import { ActionPanel, Detail, Action, LocalStorage, Icon, Keyboard } from "@raycast/api";

import { useState, useEffect } from "react";
import { WorkspaceConfig } from "../../types";
import { ResultMarkdown } from "./ResultMarkdown";
import { cancelQueuedJob } from "./cancelQueuedJob";
import { getJobDetails } from "./getJobDetails";

export function FormResult({ path, jobId, workspace }: { path: string; jobId: string; workspace: WorkspaceConfig }) {
  // const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [success, setSuccess] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);

  const [markdown, setMarkdown] = useState("");

  const [result, setResult] = useState("");
  // const [jobKind, setJobKind] = useState("");

  if (!jobId) {
    return <Detail markdown="An error occurred." />;
  }

  const jobUrl = `${workspace.remoteURL}run/${jobId}?workspace=${workspace.workspaceId}`;

  useEffect(() => {
    const updateMarkdown = async () => {
      const details = await getJobDetails(workspace, jobId);

      let result = "";
      if (details.type === "CompletedJob") {
        setCompleted(details.type === "CompletedJob");
        setSuccess(details.success);
        setIsLoading(false);
        clearInterval(timer);
        if (typeof details.result === "string") {
          result = details.result;
        } else {
          result = JSON.stringify(details.result, null, 4);
        }

        setResult(result);
      }

      setMarkdown(ResultMarkdown(workspace, details, result));
    };
    const timer = setInterval(updateMarkdown, 1000);

    updateMarkdown();

    return () => clearInterval(timer);
  }, [workspace, jobId]);

  // flow by path, with latest run
  const time = new Date().getTime();
  LocalStorage.setItem(`${path}:last_exec_time`, time);

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Job" url={jobUrl} />
          {completed && success && (
            <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Copy} title="Copy Result" content={result} />
          )}
          {!completed && (
            <Action
              icon={Icon.XMarkCircle}
              title="Cancel Job"
              shortcut={{ modifiers: ["ctrl"], key: "c" }}
              onAction={async () => {
                cancelQueuedJob(workspace, jobId);
                setCompleted(true);
              }}
            />
          )}

          <Action.OpenInBrowser
            title="Open Past Runs"
            url={`${workspace.remoteURL}runs/${path}?workspace=${workspace.workspaceId}`}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
    />
  );
}
