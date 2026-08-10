import {
  MenuBarExtra,
  Icon,
  getPreferenceValues,
  open,
  Clipboard,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getAllJobStatuses,
  kickstartJob,
  KickstartCancelledError,
} from "./api/launchd";
import { getLogTail } from "./api/logs";
import { timeAgo, timeUntil, formatDateTime } from "./utils/time";
import {
  getOverallStatus,
  getMenuBarIcon,
  getMenuBarTitle,
  getJobIcon,
  getStatusText,
} from "./utils/status";

export default function Command() {
  const { launchdLabels } = getPreferenceValues<Preferences.Menubar>();
  const labels = launchdLabels
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const {
    data: jobs,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    (labelList: string[]) => getAllJobStatuses(labelList),
    [labels],
    { initialData: undefined },
  );

  if (error) {
    return (
      <MenuBarExtra icon={Icon.Warning} title="Error" tooltip={error.message}>
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item title={error.message} />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  if (isLoading || !jobs) {
    return (
      <MenuBarExtra
        icon={Icon.CircleProgress}
        isLoading={true}
        tooltip="Loading job status..."
      />
    );
  }

  const overall = getOverallStatus(jobs);
  const icon = getMenuBarIcon(overall);
  const title = getMenuBarTitle(jobs);

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      tooltip="Launchd Job Status"
      isLoading={isLoading}
    >
      {jobs.map((job) => (
        <MenuBarExtra.Section key={job.label} title={job.displayName}>
          <MenuBarExtra.Item
            title="Status"
            subtitle={getStatusText(job)}
            icon={getJobIcon(job)}
          />
          {job.lastRunTime && (
            <MenuBarExtra.Item
              title="Last Run"
              subtitle={`${formatDateTime(job.lastRunTime)} (${timeAgo(job.lastRunTime)})`}
              icon={Icon.Clock}
            />
          )}
          {job.nextRunTime && (
            <MenuBarExtra.Item
              title="Next Run"
              subtitle={`${formatDateTime(job.nextRunTime)} (${timeUntil(job.nextRunTime)})`}
              icon={Icon.Calendar}
            />
          )}
          {job.scheduleDescription && (
            <MenuBarExtra.Item
              title="Schedule"
              subtitle={job.scheduleDescription}
              icon={Icon.Repeat}
            />
          )}
          {job.stdoutPath &&
          job.stderrPath &&
          job.stdoutPath !== job.stderrPath ? (
            <>
              <MenuBarExtra.Item
                title="View Stdout Log"
                icon={Icon.Document}
                onAction={() => open(job.stdoutPath!)}
              />
              <MenuBarExtra.Item
                title="View Stderr Log"
                icon={Icon.Document}
                onAction={() => open(job.stderrPath!)}
              />
            </>
          ) : (
            job.stdoutPath && (
              <MenuBarExtra.Item
                title="View Log"
                icon={Icon.Document}
                onAction={() => open(job.stdoutPath!)}
              />
            )
          )}
          <MenuBarExtra.Item
            title="Copy Last 50 Lines"
            icon={Icon.Clipboard}
            onAction={async () => {
              const logPath = job.stdoutPath || job.stderrPath;
              if (!logPath) {
                await showHUD("No log file found");
                return;
              }
              const tail = await getLogTail(logPath);
              if (tail) {
                await Clipboard.copy(tail);
                await showHUD("Copied to clipboard");
              } else {
                await showHUD("Could not read log file");
              }
            }}
          />
          <MenuBarExtra.Item
            title="Re-run Now"
            icon={Icon.Play}
            onAction={async () => {
              try {
                await kickstartJob(job.label, job.plistPath);
                await showHUD(`Started ${job.displayName}`);
                revalidate();
              } catch (e) {
                if (e instanceof KickstartCancelledError) {
                  await showHUD("Cancelled");
                  return;
                }
                await showHUD(
                  `Failed to start: ${e instanceof Error ? e.message : "unknown error"}`,
                );
              }
            }}
          />
          {job.plistPath && (
            <MenuBarExtra.Item
              title="Open Plist"
              icon={Icon.Gear}
              onAction={() => open(job.plistPath!)}
            />
          )}
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
