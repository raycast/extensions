import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchFastServers, measureDownloadMbps, measureLatencyMs, measureUploadMbps } from "./fast";

type Phase = "download" | "upload" | "done" | "error";

function formatMbps(value: number): string {
  return value < 10 ? value.toFixed(1) : Math.round(value).toString();
}

export default function Command() {
  const [runId, setRunId] = useState(0);
  const [phase, setPhase] = useState<Phase>("download");
  const [downloadMbps, setDownloadMbps] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number>();
  const [uploadMbps, setUploadMbps] = useState<number>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [serverLocation, setServerLocation] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setPhase("download");
    setDownloadMbps(0);
    setLatencyMs(undefined);
    setUploadMbps(undefined);
    setErrorMessage(undefined);
    (async () => {
      const servers = await fetchFastServers(controller.signal);
      setServerLocation(servers.location);
      setDownloadMbps(await measureDownloadMbps(servers, controller.signal, setDownloadMbps));
      setLatencyMs(await measureLatencyMs(servers, controller.signal));
      setPhase("upload");
      setUploadMbps(await measureUploadMbps(servers, controller.signal, setUploadMbps));
      setPhase("done");
    })().catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
    });
    return () => controller.abort();
  }, [runId]);

  const isTesting = phase === "download" || phase === "upload";
  const downloadResult = `# ${formatMbps(downloadMbps)} Mbps\n\nDownload`;
  const uploadResult = `# ${formatMbps(uploadMbps ?? 0)} Mbps\n\nUpload`;
  const markdown = {
    download: downloadResult,
    upload: uploadResult,
    done: `${downloadResult}\n\n${uploadResult}`,
    error: `# Speed test failed\n\n${errorMessage}`,
  }[phase];
  const summary = [
    `Download: ${formatMbps(downloadMbps)} Mbps`,
    uploadMbps !== undefined && `Upload: ${formatMbps(uploadMbps)} Mbps`,
    latencyMs !== undefined && `Latency: ${Math.round(latencyMs)} ms`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      isLoading={isTesting}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Download" text={`${formatMbps(downloadMbps)} Mbps`} />
          <Detail.Metadata.Label
            title="Upload"
            text={uploadMbps === undefined ? "…" : `${formatMbps(uploadMbps)} Mbps`}
          />
          <Detail.Metadata.Label title="Latency" text={latencyMs === undefined ? "…" : `${Math.round(latencyMs)} ms`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Server" text={serverLocation ?? "…"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Run Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => setRunId((id) => id + 1)}
          />
          <Action.CopyToClipboard title="Copy Results" content={summary} />
        </ActionPanel>
      }
    />
  );
}
