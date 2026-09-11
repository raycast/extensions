import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readIntervalSettings, webUrlFor } from "../lib/api";
import { errorMessage } from "../lib/format";

export function ScheduleDetail({ val, path, branch }: { val: string; path: string; branch: string }) {
  const { data, isLoading, error } = useCachedPromise(
    (identifier: string, filePath: string, currentBranch: string) =>
      readIntervalSettings(identifier, filePath, { branch: currentBranch }),
    [val, path, branch],
  );

  const schedule =
    data?.type === "cron" ? (data.cron ?? "—") : data ? `Every ${data.delay ?? "?"} ${data.unit ?? ""}`.trim() : "—";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Schedule · ${path}`}
      markdown={
        error
          ? `## Could not read the schedule\n\n${errorMessage(error)}`
          : `# ${schedule}\n\nSchedules are edited on val.town.`
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Kind" text={data?.type ?? "—"} />
          {data?.cron ? <Detail.Metadata.Label title="Cron" text={data.cron} /> : null}
          {data?.delay ? (
            <Detail.Metadata.Label title="Delay" text={`${data.delay} ${data.unit ?? ""}`.trim()} />
          ) : null}
          <Detail.Metadata.Label title="File" text={path} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Edit on Val Town" url={webUrlFor(val, path)} />
          <Action.CopyToClipboard title="Copy Schedule" content={schedule} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
}
