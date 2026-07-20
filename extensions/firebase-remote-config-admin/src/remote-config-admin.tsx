import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import { BulkOperationForm } from "./bulk-operation-form";
import BulkOperationsCommand from "./bulk-operations-command";
import { loadProjectSnapshots } from "./data";
import {
  aggregateConditions,
  aggregateParameters,
  buildConditionMarkdown,
  buildParameterMarkdown,
} from "./domain";
import ManageProjectsCommand from "./manage-projects";
import { getGroups, getProjects } from "./storage";
import type { ProjectConfig, ProjectGroup, ProjectSnapshot } from "./types";

async function loadRegistry() {
  try {
    const [projects, groups] = await Promise.all([getProjects(), getGroups()]);
    return {
      projects: (Array.isArray(projects) ? projects : []).filter((project) =>
        Boolean(project?.enabled),
      ),
      groups: Array.isArray(groups) ? groups : [],
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to load saved projects and groups.",
    );
  }
}

export default function RemoteConfigAdminCommand() {
  const {
    data: registry,
    isLoading: registryLoading,
    error: registryError,
  } = usePromise(loadRegistry, []);
  const [scope, setScope] = useState<string>("all");

  const projects: ProjectConfig[] = registry?.projects ?? [];
  const groups: ProjectGroup[] = registry?.groups ?? [];
  const selectedProjects =
    scope === "all"
      ? projects
      : scope.startsWith("group:")
        ? projects.filter((project) => {
            const group = groups.find(
              (entry) => entry.id === scope.slice("group:".length),
            );
            return Boolean(group?.projectIds.includes(project.id));
          })
        : projects.filter(
            (project) => project.id === scope.slice("project:".length),
          );

  const selectedProjectIds = selectedProjects
    .map((project) => project.id)
    .join(",");
  const {
    data: snapshots,
    isLoading: snapshotsLoading,
    error,
    revalidate,
  } = usePromise(
    async (projectIds: string) => {
      const ids = new Set(projectIds.split(",").filter(Boolean));
      return loadProjectSnapshots(
        projects.filter((project) => ids.has(project.id)),
      );
    },
    [selectedProjectIds],
    {
      execute: selectedProjects.length > 0,
      onError: async (loadError) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load Remote Config",
          message:
            loadError instanceof Error ? loadError.message : String(loadError),
        });
      },
    },
  );

  const snapshotRows: ProjectSnapshot[] = snapshots ?? [];
  const parameterRows = aggregateParameters(snapshotRows);
  const conditionRows = aggregateConditions(snapshotRows);

  if (!registryLoading && projects.length === 0) {
    const welcomeMarkdown = registryError
      ? `# Failed to load project registry\n\n${registryError.message}`
      : `# Welcome to Firebase - Remote Config

To get started, connect at least one Firebase project.

## Option 1: Application Default Credentials (recommended)

1. Run \`gcloud auth application-default login\` in your terminal
2. Come back here and open **Manage Projects**
3. Click **Import Firebase Projects**

## Option 2: Service Account JSON

1. Open **Manage Projects** and click **Add Project**
2. Enter your Firebase Project ID
3. Set the path to your service account JSON file (e.g. \`~/secrets/firebase-prod.json\`)
`;

    return (
      <Detail
        markdown={welcomeMarkdown}
        actions={
          <ActionPanel>
            <Action.Push
              title="Manage Projects"
              icon={Icon.Gear}
              target={<ManageProjectsCommand />}
            />
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={registryLoading || snapshotsLoading}
      isShowingDetail
      searchBarPlaceholder="Search parameters and conditions"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Scope"
          storeValue
          onChange={setScope}
          value={scope}
        >
          <List.Dropdown.Item
            value="all"
            title={`All Enabled Projects (${projects.length})`}
          />
          {groups.map((group) => (
            <List.Dropdown.Item
              key={group.id}
              value={`group:${group.id}`}
              title={`Group: ${group.name}`}
            />
          ))}
          {projects.map((project) => (
            <List.Dropdown.Item
              key={project.id}
              value={`project:${project.id}`}
              title={project.displayName}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title={`Parameters (${parameterRows.length})`}
        subtitle={`${selectedProjects.length} selected projects`}
      >
        {parameterRows.map((row) => {
          const firstValue = row.projectValues[0];
          return (
            <List.Item
              key={row.key}
              title={row.key}
              subtitle={firstValue?.parsedDefault?.raw ?? "missing default"}
              accessories={[
                ...(row.divergentDefaults
                  ? [{ icon: Icon.Warning, tooltip: "Divergent defaults" }]
                  : []),
                ...(row.hasConditionalValues ? [{ text: "override" }] : []),
                ...(row.semanticTypes[0]
                  ? [{ text: row.semanticTypes.join("/") }]
                  : []),
                {
                  text: `${row.projectValues.length}/${selectedProjects.length}`,
                },
              ]}
              detail={
                <List.Item.Detail markdown={buildParameterMarkdown(row)} />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Parameter"
                    icon={Icon.Pencil}
                    target={
                      <BulkOperationForm
                        availableProjects={selectedProjects}
                        groups={groups}
                        fixedProjectIds={selectedProjects.map(
                          (project) => project.id,
                        )}
                        initial={{
                          operationType: "upsert-parameter",
                          key: row.key,
                          rawValue: firstValue?.parsedDefault?.raw,
                          firebaseValueType: firstValue?.parameter.valueType,
                          description: firstValue?.parameter.description,
                        }}
                        onCompleted={revalidate}
                      />
                    }
                  />
                  <Action.Push
                    title="Delete Parameter"
                    icon={Icon.Trash}
                    target={
                      <BulkOperationForm
                        availableProjects={selectedProjects}
                        groups={groups}
                        fixedProjectIds={selectedProjects.map(
                          (project) => project.id,
                        )}
                        initial={{
                          operationType: "delete-parameter",
                          key: row.key,
                        }}
                        onCompleted={revalidate}
                      />
                    }
                  />
                  <Action.Push
                    title="Bulk Operations"
                    icon={Icon.Hammer}
                    target={<BulkOperationsCommand />}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section
        title={`Conditions (${conditionRows.length})`}
        subtitle={error ? error.message : undefined}
      >
        {conditionRows.map((row) => {
          const firstValue = row.projectValues[0];
          return (
            <List.Item
              key={row.name}
              title={row.name}
              subtitle={firstValue?.condition.expression ?? "missing condition"}
              accessories={[
                ...(row.divergentExpressions
                  ? [{ icon: Icon.Warning, tooltip: "Divergent expressions" }]
                  : []),
                {
                  text: `${row.projectValues.length}/${selectedProjects.length}`,
                },
              ]}
              detail={
                <List.Item.Detail markdown={buildConditionMarkdown(row)} />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Condition"
                    icon={Icon.Pencil}
                    target={
                      <BulkOperationForm
                        availableProjects={selectedProjects}
                        groups={groups}
                        fixedProjectIds={selectedProjects.map(
                          (project) => project.id,
                        )}
                        initial={{
                          operationType: "upsert-condition",
                          name: row.name,
                          expression: firstValue?.condition.expression,
                          tagColor: firstValue?.condition.tagColor,
                        }}
                        onCompleted={revalidate}
                      />
                    }
                  />
                  <Action.Push
                    title="Delete Condition"
                    icon={Icon.Trash}
                    target={
                      <BulkOperationForm
                        availableProjects={selectedProjects}
                        groups={groups}
                        fixedProjectIds={selectedProjects.map(
                          (project) => project.id,
                        )}
                        initial={{
                          operationType: "delete-condition",
                          name: row.name,
                        }}
                        onCompleted={revalidate}
                      />
                    }
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
