import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { HakunaTimer, Project } from "./hakuna-api";
import { getSettings } from "./settings";
import { ProjectTasks } from "./tasks";
import StartTimerView from "./start-timer-view";
import AddTimeEntry from "./add-time-entry";

const ALL_CLIENTS = "all";

function ProjectDetail({ project }: { project: Project }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={project.name} />
          <List.Item.Detail.Metadata.Label
            title="Code"
            text={project.code || "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="Starts On"
            text={project.starts_on || "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="Ends On"
            text={project.ends_on || "—"}
          />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={project.archived ? "Archived" : "Active"}
              color={project.archived ? Color.Purple : Color.Green}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Client"
            text={project.client || "—"}
          />
          <List.Item.Detail.Metadata.TagList title="Teams">
            {(project.teams ?? []).map((t) => (
              <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Groups">
            {(project.groups ?? []).map((g) => (
              <List.Item.Detail.Metadata.TagList.Item key={g} text={g} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Budget"
            text={project.budget ? String(project.budget) : "—"}
            icon={project.budget_is_monthly ? Icon.Repeat : undefined}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Notes"
            text={project.notes || "—"}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Tasks">
            {project.tasks.map((t) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={t.id}
                text={t.name}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function ProjectsList({ initialClient }: { initialClient?: string }) {
  const { apiToken } = getSettings();
  const [selectedClient, setSelectedClient] = useState<string>(
    initialClient ?? ALL_CLIENTS,
  );
  const [showArchived, setShowArchived] = useState(false);

  const { data, isLoading } = useCachedPromise(
    async (token: string) => {
      const api = new HakunaTimer(token);
      const company = await api.getCompany();
      if (!company.projects_enabled) {
        return { projectsEnabled: false, projects: [] as Project[] };
      }
      return { projectsEnabled: true, projects: await api.getProjects() };
    },
    [apiToken],
    {
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      },
    },
  );

  const projects = data?.projects ?? [];

  if (!isLoading && data?.projectsEnabled === false) {
    return (
      <List navigationTitle="Projects">
        <List.EmptyView
          title="Projects Not Enabled"
          description="The projects module is not enabled for this workspace."
        />
      </List>
    );
  }

  const clients = [
    ...new Set(projects.map((p) => p.client).filter(Boolean)),
  ].sort();
  const filtered =
    selectedClient === ALL_CLIENTS
      ? projects
      : projects.filter((p) => p.client === selectedClient);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Projects"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Customer"
          value={selectedClient}
          onChange={setSelectedClient}
        >
          <List.Dropdown.Item title="All Customers" value={ALL_CLIENTS} />
          <List.Dropdown.Section title="Customers">
            {[
              ...new Set([
                ...(initialClient ? [initialClient] : []),
                ...clients,
              ]),
            ].map((clientName) => (
              <List.Dropdown.Item
                key={clientName}
                title={clientName}
                value={clientName}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {[
        {
          title: "Active",
          items: filtered.filter((p) => !p.archived),
          alwaysShow: true,
        },
        {
          title: "Archived",
          items: filtered.filter((p) => p.archived),
          alwaysShow: false,
        },
      ].map(({ title, items, alwaysShow }) =>
        (alwaysShow || showArchived) && items.length > 0 ? (
          <List.Section key={title} title={title}>
            {items.map((project) => (
              <List.Item
                key={project.id}
                title={
                  project.code
                    ? `[${project.code}] ${project.name}`
                    : project.name
                }
                subtitle={project.client || undefined}
                detail={<ProjectDetail project={project} />}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Tasks"
                      target={<ProjectTasks project={project} />}
                    />
                    <Action.Push
                      title="Start Timer"
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      target={<StartTimerView projectId={String(project.id)} />}
                    />
                    <Action.Push
                      title="Add Entry"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<AddTimeEntry projectId={String(project.id)} />}
                    />
                    <Action
                      title={showArchived ? "Hide Archived" : "Show Archived"}
                      onAction={() => setShowArchived((v) => !v)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

export default function Command() {
  return <ProjectsList />;
}
