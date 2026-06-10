/**
 * Show Projects command - displays all projects from Pinwork.
 */

import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { openView } from "./api/pinwork";
import { ProjectListItem } from "./components";
import { usePinworkAvailability } from "./hooks/usePinworkAvailability";
import { useProjects } from "./hooks/useProjects";

export default function ShowProjectsCommand() {
  const availability = usePinworkAvailability();
  const {
    activeProjects,
    archivedProjects,
    projects,
    isLoading,
    error,
    revalidate,
  } = useProjects({ execute: availability.isReady });

  const isBusy = availability.isLoading || isLoading;

  async function handleRetry() {
    await availability.revalidate();
    await revalidate();
  }

  async function handleOpenPinwork() {
    await openView("today");
  }

  return (
    <List
      isLoading={isBusy}
      searchBarPlaceholder="Filter projects..."
      navigationTitle="Projects"
    >
      {!availability.installed ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Pinwork Not Installed"
          description="Install the Pinwork app to view projects."
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={handleRetry} />
            </ActionPanel>
          }
        />
      ) : !availability.running ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Pinwork Not Running"
          description="Open Pinwork to load your projects."
          actions={
            <ActionPanel>
              <Action title="Open Pinwork" onAction={handleOpenPinwork} />
              <Action title="Retry" onAction={handleRetry} />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to Load Projects"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={handleRetry} />
            </ActionPanel>
          }
        />
      ) : projects.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects"
          description="You haven't created any projects yet."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={handleRetry}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {activeProjects.length > 0 && (
            <List.Section
              title="Active Projects"
              subtitle={`${activeProjects.length} project${
                activeProjects.length === 1 ? "" : "s"
              }`}
            >
              {activeProjects.map((project) => (
                <ProjectListItem key={project.id} project={project} />
              ))}
            </List.Section>
          )}

          {archivedProjects.length > 0 && (
            <List.Section
              title="Archived"
              subtitle={`${archivedProjects.length} project${
                archivedProjects.length === 1 ? "" : "s"
              }`}
            >
              {archivedProjects.map((project) => (
                <ProjectListItem key={project.id} project={project} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
