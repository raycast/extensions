import { useState } from "react";
import { List, Icon, Color } from "@raycast/api";
import type { JobHealth, LaunchJob } from "./lib/types";
import { useJobs } from "./hooks/useJobs";
import { healthIcon, exitTagColor, sourceLabel } from "./helpers/icons";
import { getShowAppleServices } from "./helpers/preferences";
import { formatRelativeTime } from "./lib/utils/format";
import { JobDetailPanel } from "./components/JobDetailPanel";
import { JobActionPanel } from "./components/JobActionPanel";

export default function SearchJobs() {
  const [showApple, setShowApple] = useState(getShowAppleServices);
  const [healthFilter, setHealthFilter] = useState<JobHealth | "all">("all");

  const { jobs, isLoading, revalidate } = useJobs({
    showAppleServices: showApple,
    healthFilter,
  });

  // Group jobs by source
  const grouped = groupBySource(jobs);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter jobs..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Health"
          value={healthFilter}
          onChange={(val) => setHealthFilter(val as JobHealth | "all")}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item
            title="Healthy"
            value="healthy"
            icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
          />
          <List.Dropdown.Item
            title="Error"
            value="error"
            icon={{ source: Icon.CircleFilled, tintColor: Color.Red }}
          />
          <List.Dropdown.Item
            title="Warning"
            value="warning"
            icon={{ source: Icon.CircleFilled, tintColor: Color.Yellow }}
          />
          <List.Dropdown.Item
            title="Unknown"
            value="unknown"
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
        </List.Dropdown>
      }
    >
      {grouped.map(({ source, jobs: groupJobs }) => (
        <List.Section key={source} title={sourceLabel(source)}>
          {groupJobs.map((job) => (
            <List.Item
              key={job.label}
              title={job.label}
              subtitle={job.program}
              icon={healthIcon(job)}
              keywords={[
                job.programFull,
                job.source,
                job.schedule.humanReadable,
              ]}
              accessories={[
                { text: job.schedule.humanReadable },
                ...(job.schedule.nextRun
                  ? [
                      {
                        text: formatRelativeTime(job.schedule.nextRun),
                        tooltip: job.schedule.nextRun.toLocaleString(),
                      },
                    ]
                  : []),
                {
                  tag: {
                    value: job.exitCodeMeaning,
                    color: exitTagColor(job),
                  },
                },
              ]}
              detail={<JobDetailPanel job={job} />}
              actions={
                <JobActionPanel
                  job={job}
                  onToggleAppleServices={() => setShowApple((v) => !v)}
                  onRefresh={revalidate}
                  showAppleServices={showApple}
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function groupBySource(
  jobs: LaunchJob[],
): { source: LaunchJob["source"]; jobs: LaunchJob[] }[] {
  const order: LaunchJob["source"][] = [
    "user",
    "system-agent",
    "system-daemon",
  ];
  const groups = new Map<LaunchJob["source"], LaunchJob[]>();

  for (const job of jobs) {
    const existing = groups.get(job.source) ?? [];
    existing.push(job);
    groups.set(job.source, existing);
  }

  return order
    .filter((s) => groups.has(s))
    .map((s) => ({ source: s, jobs: groups.get(s)! }));
}
