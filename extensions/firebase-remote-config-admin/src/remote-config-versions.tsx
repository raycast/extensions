import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import ManageProjectsCommand from "./manage-projects";
import {
  listRemoteConfigVersions,
  rollbackRemoteConfig,
} from "./remote-config-client";
import { getProjects } from "./storage";

async function loadProjects() {
  return (await getProjects()).filter((project) => project.enabled);
}

export default function RemoteConfigVersionsCommand() {
  const { data: projects, isLoading: projectsLoading } = useCachedPromise(
    loadProjects,
    [],
    { keepPreviousData: true },
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const selectedProject = projects?.find(
    (project) => project.id === (selectedProjectId || projects?.[0]?.id),
  );

  const {
    data: versions,
    isLoading: versionsLoading,
    revalidate,
  } = useCachedPromise(
    async (projectId?: string) => {
      const project = (projects ?? []).find((entry) => entry.id === projectId);
      if (!project) return [];
      return listRemoteConfigVersions(project);
    },
    [selectedProject?.id],
    { execute: Boolean(selectedProject), keepPreviousData: true },
  );

  if (!projectsLoading && (!projects || projects.length === 0)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.PlusCircle}
          title="No Firebase projects"
          description="Add a Firebase project first. Open Manage Projects to get started."
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Projects"
                icon={Icon.Gear}
                target={<ManageProjectsCommand />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={projectsLoading || versionsLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Project"
          value={selectedProjectId || selectedProject?.id || ""}
          onChange={setSelectedProjectId}
          storeValue
        >
          {(projects ?? []).map((project) => (
            <List.Dropdown.Item
              key={project.id}
              value={project.id}
              title={project.displayName}
            />
          ))}
        </List.Dropdown>
      }
    >
      {(versions ?? []).map((version) => (
        <List.Item
          key={version.versionNumber ?? `${version.updateTime}`}
          icon={Icon.Clock}
          title={`Version ${version.versionNumber ?? "unknown"}`}
          subtitle={
            version.description || version.updateType || "Remote Config publish"
          }
          accessories={[
            ...(version.updateUser?.email
              ? [{ text: version.updateUser.email }]
              : []),
            ...(version.updateTime
              ? [{ date: new Date(version.updateTime) }]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Rollback to This Version"
                icon={Icon.RotateAntiClockwise}
                onAction={async () => {
                  if (!selectedProject || !version.versionNumber) return;
                  const confirmed = await confirmAlert({
                    title: `Rollback ${selectedProject.displayName}?`,
                    message: `Remote Config will be rolled back to version ${version.versionNumber}.`,
                    primaryAction: {
                      title: "Rollback",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (!confirmed) return;

                  try {
                    await rollbackRemoteConfig(
                      selectedProject,
                      version.versionNumber,
                    );
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Rollback complete",
                      message: `${selectedProject.displayName} -> version ${version.versionNumber}`,
                    });
                    revalidate();
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Rollback failed",
                      message:
                        error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
