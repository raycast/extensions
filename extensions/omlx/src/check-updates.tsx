import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  checkForUpdate,
  fetchServerStatus,
  getDashboardUrl,
  isOmlxInstalled,
  isServerRunning,
  type UpdateCheckResponse,
} from "./lib/omlx";

export default function CheckUpdates() {
  const [update, setUpdate] = useState<UpdateCheckResponse | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);

    if (!isOmlxInstalled()) {
      setIsLoading(false);
      await showToast({ style: Toast.Style.Failure, title: "oMLX not found" });
      return;
    }

    try {
      const running = await isServerRunning();
      if (!running) {
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "oMLX server is offline",
        });
        return;
      }

      const [updateData, statusData] = await Promise.all([
        checkForUpdate(),
        fetchServerStatus(),
      ]);
      setUpdate(updateData);
      setCurrentVersion(statusData.version);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to check for updates",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const markdown = update
    ? update.update_available
      ? `# Update Available\n\nA new version of oMLX is available: **${update.latest_version ?? "newer version"}**`
      : "# Up to Date\n\noMLX is running the latest version."
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        update && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Installed"
              text={currentVersion ? `v${currentVersion}` : "—"}
            />
            {update.update_available && update.latest_version && (
              <Detail.Metadata.Label
                title="Latest"
                text={`v${update.latest_version}`}
              />
            )}
            <Detail.Metadata.Label
              title="Channel"
              text={update.update_channel}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {update?.update_available && update.release_url && (
            <Action.OpenInBrowser
              title="View Release"
              url={update.release_url}
            />
          )}
          <Action
            title="Check Again"
            icon={Icon.ArrowClockwise}
            onAction={load}
          />
          <Action.OpenInBrowser
            title="Open Web Dashboard"
            url={getDashboardUrl()}
          />
        </ActionPanel>
      }
    />
  );
}
