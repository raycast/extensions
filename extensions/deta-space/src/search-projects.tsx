import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useSpace } from "./hooks/use-space";
import RevisionList from "./builder/revisions";
import Release from "./builder/releases";
import BuildList from "./builder/builds";
import { Project, Instance } from "./types/types";
import { useMemo } from "react";

type ProjectResponse = {
  apps: Project[];
};

type InstancesResponse = {
  instances: Instance[];
};

export default function SearchProjects() {
  const { data: projects, isLoading: projectsLoading } = useSpace<ProjectResponse>("/apps");
  const { data: instances, isLoading: instancesLoading } = useSpace<InstancesResponse>(
    "/instances?channel=development"
  );

  const instanceMap = useMemo(() => {
    return instances?.instances.reduce((acc, instance) => {
      acc[instance.app_id] = instance;
      return acc;
    }, {} as Record<string, Instance>);
  }, [instances]);

  return (
    <List isLoading={projectsLoading && instancesLoading} navigationTitle="Builder">
      {projects?.apps.map((project) => (
        <Project key={project.id} project={project} instance={instanceMap?.[project.id]} />
      ))}
    </List>
  );
}

function Project(props: { project: Project; instance?: Instance }) {
  return (
    <List.Item
      key={props.project.id}
      icon={Icon.Hammer}
      title={props.project.name}
      subtitle={props.project.id}
      accessories={[
        { tag: { value: props.project.status, color: Color.Green } },
        // { tag: new Date(props.project.created_at) }
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Builder" url={`https://deta.space/builder/${props.project.id}`} />
            {props.instance ? <Action.OpenInBrowser title="Open Builder Instance" url={props.instance.url} /> : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Hammer}
              title="View Builds"
              target={<BuildList project={props.project} />}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
            <Action.Push
              icon={Icon.List}
              title="View Revisions"
              target={<RevisionList project={props.project} />}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action.Push
              icon={Icon.Globe}
              title="View Releases"
              target={<Release project={props.project} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Builder Link"
              content={`https://deta.space/builder/${props.project.id}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            {props.instance ? (
              <Action.CopyToClipboard
                title="Copy Instance Link"
                content={props.instance.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Project ID"
              content={props.project.id}
              shortcut={{ modifiers: ["cmd", "opt"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
