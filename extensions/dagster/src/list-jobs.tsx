import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Keyboard,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { fetchJobs, launchRun, reexecuteRun, dagsterRunUrl, dagsterJobUrl, type Job } from "./api";

import { formatTimestamp, formatDuration, statusIcon, statusColor } from "./helpers";
import JobSchedules from "./components/JobSchedules";

export default function ListJobs() {
  const { data: jobs, isLoading, revalidate } = useCachedPromise(fetchJobs);
  const [selectedLocation, setSelectedLocation] = useState("all");

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const job of jobs ?? []) set.add(job.locationName);
    return Array.from(set).sort();
  }, [jobs]);

  const filtered =
    selectedLocation === "all" ? (jobs ?? []) : (jobs ?? []).filter((j) => j.locationName === selectedLocation);

  const grouped = new Map<string, Job[]>();
  for (const job of filtered) {
    const group = grouped.get(job.locationName) ?? [];
    group.push(job);
    grouped.set(job.locationName, group);
  }

  async function handleLaunch(job: Job) {
    if (
      await confirmAlert({
        title: `Launch ${job.name}?`,
        message: "This will start a new run of this job.",
        primaryAction: { title: "Launch" },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Launching run..." });
      try {
        const runId = await launchRun(job.name, job.repositoryName, job.locationName);
        toast.style = Toast.Style.Success;
        toast.title = "Run launched";
        toast.primaryAction = {
          title: "Open in Dagster",
          onAction: () => open(dagsterRunUrl(runId)),
        };
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = String(e);
      }
    }
  }

  async function handleReexecute(job: Job, strategy: "ALL_STEPS" | "FROM_FAILURE") {
    const lastRun = job.runs[0];
    if (!lastRun) {
      await showToast({ style: Toast.Style.Failure, title: "No previous run to reexecute" });
      return;
    }
    const label = strategy === "FROM_FAILURE" ? "Retry from Failure" : "Retry All Steps";
    if (
      await confirmAlert({
        title: `${label} for ${job.name}?`,
        message: `This will reexecute run ${lastRun.id.slice(0, 8)} with strategy: ${strategy}.`,
        primaryAction: { title: label },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Reexecuting run..." });
      try {
        const runId = await reexecuteRun(lastRun.id, strategy);
        toast.style = Toast.Style.Success;
        toast.title = "Run reexecuted";
        toast.primaryAction = {
          title: "Open in Dagster",
          onAction: () => open(dagsterRunUrl(runId)),
        };
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = String(e);
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter jobs..."
      searchBarAccessory={
        locations.length > 1 ? (
          <List.Dropdown tooltip="Code Location" value={selectedLocation} onChange={setSelectedLocation}>
            <List.Dropdown.Item title="All Locations" value="all" />
            <List.Dropdown.Section>
              {locations.map((loc) => (
                <List.Dropdown.Item key={loc} title={loc} value={loc} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView title="No Jobs" description="No jobs found in your Dagster instance." />
      {Array.from(grouped.entries()).map(([location, locationJobs]) => (
        <List.Section key={location} title={location}>
          {locationJobs.map((job) => {
            const lastRun = job.runs[0];
            const activeSchedules = job.schedules.filter((s) => s.scheduleState.status === "RUNNING");
            const accessories: List.Item.Accessory[] = [];

            if (activeSchedules.length > 0) {
              accessories.push({
                tag: { value: activeSchedules.map((s) => s.cronSchedule).join(", "), color: Color.Blue },
              });
            }
            if (lastRun) {
              const duration = lastRun.startTime && lastRun.endTime ? lastRun.endTime - lastRun.startTime : null;
              accessories.push({ text: formatTimestamp(lastRun.startTime) });
              if (duration !== null) {
                accessories.push({ text: formatDuration(duration) });
              }
            }

            return (
              <List.Item
                key={`${job.locationName}/${job.repositoryName}/${job.name}`}
                icon={
                  lastRun
                    ? { source: statusIcon(lastRun.status), tintColor: statusColor(lastRun.status) }
                    : { source: Icon.Circle, tintColor: Color.SecondaryText }
                }
                title={job.name}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser
                        title="Open Job in Dagster"
                        url={dagsterJobUrl(job.locationName, job.name)}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                      {lastRun && <Action.OpenInBrowser title="Open Last Run" url={dagsterRunUrl(lastRun.id)} />}
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={revalidate}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Run">
                      <Action title="Launch New Run" icon={Icon.Play} onAction={() => handleLaunch(job)} />
                      <Action
                        title="Retry Last Run (All Steps)"
                        icon={Icon.ArrowClockwise}
                        onAction={() => handleReexecute(job, "ALL_STEPS")}
                      />
                      <Action
                        title="Retry Last Run (from Failure)"
                        icon={Icon.Redo}
                        onAction={() => handleReexecute(job, "FROM_FAILURE")}
                      />
                    </ActionPanel.Section>
                    {job.schedules.length > 0 && (
                      <ActionPanel.Section title="Schedules">
                        <Action.Push
                          title="Manage Schedules"
                          icon={Icon.Clock}
                          target={
                            <JobSchedules
                              jobName={job.name}
                              schedules={job.schedules}
                              repositoryName={job.repositoryName}
                              locationName={job.locationName}
                            />
                          }
                        />
                      </ActionPanel.Section>
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
