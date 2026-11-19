import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getProjects, getProjectColor, startTimer, type Project } from "./api";
import { ListErrorView } from "./error-view";
import { groupBy } from "./group-by";

type StatusFilter = "active" | "all";

export default function Projects() {
  const [filter, setFilter] = useState<StatusFilter>("active");

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (status: StatusFilter) => getProjects({ status }),
    [filter],
    {
      keepPreviousData: true,
      initialData: [] as Project[],
      failureToastOptions: { title: "Failed to load projects" },
    },
  );

  async function handleStartTimer(project: Project) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting timer...",
      });
      await startTimer(project.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Timer started",
        message: project.title,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to start timer" });
    }
  }

  const grouped = useMemo(
    () => groupBy(data, (project) => project.team?.name || "No Team"),
    [data],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          storeValue
          onChange={(value) => setFilter(value as StatusFilter)}
        >
          <List.Dropdown.Item title="Active Projects" value="active" />
          <List.Dropdown.Item title="All Projects" value="all" />
        </List.Dropdown>
      }
    >
      {error && (
        <ListErrorView error={error} what="projects" onRetry={revalidate} />
      )}
      {grouped.map(([team, teamProjects]) => (
        <List.Section key={team} title={team}>
          {teamProjects.map((project) => (
            <List.Item
              key={project.id}
              icon={{
                source: Icon.Circle,
                tintColor: getProjectColor(project.color ?? 0),
              }}
              title={project.title}
              subtitle={project.employer}
              accessories={
                project.archived
                  ? [{ tag: { value: "Archived", color: Color.SecondaryText } }]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Start Timer"
                    icon={Icon.Play}
                    onAction={() => handleStartTimer(project)}
                  />
                  <Action.OpenInBrowser
                    title="Open in Timesheet"
                    url={`https://my.timesheet.io/projects/show/${project.id}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Project ID"
                    content={project.id}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
