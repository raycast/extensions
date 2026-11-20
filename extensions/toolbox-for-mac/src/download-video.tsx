import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ToolForm } from "./components/ToolForm";
import { listTools, STORE_URL } from "./lib/toolbox";

export default function DownloadVideo() {
  const { data, isLoading, error } = usePromise(listTools);
  const tool = data?.find((t) => t.name === "download_video");
  if (tool) return <ToolForm tool={tool} />;
  return (
    <Detail
      isLoading={isLoading}
      markdown={
        error
          ? `## Toolbox isn't ready\n\n${error.message}`
          : isLoading
            ? ""
            : "This Toolbox version has no Download Video tool. Update Toolbox."
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Get Toolbox" url={STORE_URL} />
        </ActionPanel>
      }
    />
  );
}
