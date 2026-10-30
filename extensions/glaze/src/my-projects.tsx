import { GlazeAction } from "./components/glaze-action";
import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { IS_GLAZE_INSTALLED } from "./lib/paths";
import { GlazeApp, EDITOR_APPS } from "./lib/types";
import { getLocalProjects } from "./lib/apps";
import { getAppIcon } from "./lib/icons";
import {
  editWithAgent,
  getAvailableEditors,
  launchApp,
  openGlazeApp,
  openInEditor,
  revealInFinder,
} from "./lib/deeplinks";
import { GlazeNotInstalled } from "./components/glaze-not-installed";
import { ProjectDetail } from "./components/project-detail";
import * as fs from "fs";

export default function Command() {
  return IS_GLAZE_INSTALLED ? <ProjectsList /> : <GlazeNotInstalled />;
}

function ProjectsList() {
  const {
    data: projects,
    isLoading,
    revalidate,
    error,
  } = usePromise(getLocalProjects);

  const actions = (
    <ActionPanel>
      <GlazeAction
        title="Open Glaze"
        icon={Icon.AppWindow}
        onAction={openGlazeApp}
      />
      <GlazeAction
        title="Refresh Projects"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      actions={actions}
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.Document}
        title={
          error
            ? "Couldn't Load Projects"
            : projects?.length
              ? "No Matching Projects"
              : "No Projects Yet"
        }
        description={
          error
            ? error.message
            : projects?.length
              ? "Try another project name."
              : "Open Glaze to create your first project, or describe an app with Ask Glaze."
        }
        actions={actions}
      />
      {!error &&
        projects?.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            onDelete={revalidate}
          />
        ))}
    </List>
  );
}

function ProjectListItem({
  project,
  onDelete,
}: {
  project: GlazeApp;
  onDelete: () => void;
}) {
  const icon = getAppIcon(project);
  const editors = getAvailableEditors();

  const glazePath = project.runtimePath;
  const sourcesPath = project.sourcesPath;
  const canEdit = glazePath && fs.existsSync(glazePath);
  const canOpenInEditor = sourcesPath && fs.existsSync(sourcesPath);

  return (
    <List.Item
      icon={icon}
      title={project.displayName || project.name}
      subtitle={project.description}
      accessories={[{ tag: `v${project.version}` }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {project.bundlePath && (
              <GlazeAction
                title="Open App"
                icon={Icon.AppWindow}
                onAction={() => launchApp(project.bundlePath!)}
              />
            )}
            {canEdit && (
              <GlazeAction
                title="Edit with Agent"
                icon={Icon.Wand}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={async () => {
                  await editWithAgent(glazePath!, project.id);
                  await closeMainWindow();
                }}
              />
            )}
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<ProjectDetail project={project} />}
            />
          </ActionPanel.Section>

          {canOpenInEditor && editors.length > 0 && (
            <ActionPanel.Section title="Open With">
              {editors.map((editor) => (
                <GlazeAction
                  key={editor}
                  title={EDITOR_APPS[editor].label}
                  icon={Icon.Code}
                  onAction={() => openInEditor(sourcesPath!, editor)}
                />
              ))}
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <GlazeAction
              title="Refresh Projects"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onDelete}
            />
            <GlazeAction
              title="Reveal in Finder"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => revealInFinder(project.path)}
            />
            <Action.CopyToClipboard
              title="Copy App Path"
              content={project.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <GlazeAction
              title="Delete Project"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Project",
                    message: `Are you sure you want to delete "${project.displayName || project.name}"? The project and app bundle will move to Trash.`,
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  try {
                    await trash([
                      project.path,
                      ...(project.bundlePath &&
                      project.bundlePath !== project.path
                        ? [project.bundlePath]
                        : []),
                    ]);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Project deleted",
                    });
                    onDelete();
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to delete project",
                      message: String(error),
                    });
                  }
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
