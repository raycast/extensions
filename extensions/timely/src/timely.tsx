import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useTimely } from "./hooks/useTimely";
import { getProjects, projectUrl, type TimelyProject } from "./lib/timely-api";

export default function Command() {
  const timely = useTimely();
  const [projects, setProjects] = useState<TimelyProject[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  useEffect(() => {
    if (timely.status !== "ready") return;

    const { accessToken, accountId } = timely;
    let cancelled = false;

    getProjects(accessToken, accountId)
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((e) => {
        if (!cancelled) setProjectsError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [timely]);

  if (timely.status === "loading") {
    return <List isLoading />;
  }

  if (timely.status === "error") {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Connection failed" description={timely.error} />
      </List>
    );
  }

  if (projectsError) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Could not load projects" description={projectsError} />
      </List>
    );
  }

  if (projects === null) {
    return <List isLoading />;
  }

  if (projects.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.Folder} title="No projects" description="Create one with Create Project." />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search projects...">
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={{ source: Icon.Circle, tintColor: project.client?.color ? `#${project.client.color}` : undefined }}
          title={project.name}
          subtitle={project.client?.name ?? "No client"}
          keywords={[project.client?.name ?? ""].filter(Boolean)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={projectUrl(timely.accountId, project.id)} title="Open in Browser" />
              <Action.CopyToClipboard
                content={project.name}
                title="Copy Project Name"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
