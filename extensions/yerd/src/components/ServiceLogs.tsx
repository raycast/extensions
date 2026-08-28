import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { runYerd, TIMEOUTS } from "../yerd/cli";

/** `yerd --json service logs <service>` — verified live: lines is a string array. */
interface ServiceLogsResponse {
  type: "service_logs";
  lines: string[];
}

export function ServiceLogs({ serviceId }: { serviceId: string }) {
  const { isLoading, data, revalidate } = useCachedPromise(
    () =>
      runYerd<ServiceLogsResponse>(
        ["service", "logs", serviceId, "--lines", "100"],
        { timeoutMs: TIMEOUTS.logs },
      ),
    [],
    { keepPreviousData: true },
  );

  const logText = (data?.lines ?? []).join("\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${serviceId} Logs`}
      markdown={`\`\`\`\n${logText}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.CopyToClipboard title="Copy Logs" content={logText} />
        </ActionPanel>
      }
    />
  );
}
