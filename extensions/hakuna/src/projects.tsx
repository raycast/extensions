import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { ClientStub, HakunaClient, ProjectResponse } from "./hakuna-api";
import { getSettings } from "./settings";
import { ProjectTasks } from "./tasks";
import TimeEntry from "./time-entry";
import Timer from "./timer";

const ALL_CLIENTS = "all";

function clientName(client?: string | ClientStub): string | undefined {
  if (client === undefined || client === null) {
    return undefined;
  }

  return typeof client === "object" ? client.name : client;
}

function ProjectDetail({ project }: { project: ProjectResponse }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={project.name} />
          <List.Item.Detail.Metadata.Label
            title="Code"
            text={project.code ?? "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="Starts On"
            text={project.starts_on ?? "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="Ends On"
            text={project.ends_on ?? "—"}
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
            text={clientName(project.client) ?? "—"}
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
            text={project.budget ?? "—"}
            icon={project.budget_is_monthly ? Icon.Repeat : undefined}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Notes"
            text={project.notes?.trim() || "—"}
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
      const client = new HakunaClient(token);
      const company = await client.getCompany();
      if (!company.projects_enabled) {
        return { projectsEnabled: false, projects: [] as ProjectResponse[] };
      }
      return { projectsEnabled: true, projects: await client.getProjects() };
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
    ...new Set(projects.map((p) => clientName(p.client)).filter(Boolean)),
  ].sort() as string[];
  const filtered =
    selectedClient === ALL_CLIENTS
      ? projects
      : projects.filter((p) => clientName(p.client) === selectedClient);

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
            ].map((client) => (
              <List.Dropdown.Item key={client} title={client} value={client} />
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
                subtitle={clientName(project.client)}
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
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "t" },
                        Windows: { modifiers: ["ctrl"], key: "t" },
                      }}
                      target={<Timer projectId={project.id} />}
                    />
                    <Action.Push
                      title="Add Entry"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={<TimeEntry projectId={project.id} />}
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
