// src/projects/components/ProjectListItem.tsx
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  useNavigation,
  Form,
  showToast,
  Toast,
} from "@raycast/api";
import { getProjectIcon } from "../../utils";
import { migrateProjectSettings } from "../../settings";
import { isProject } from "../../utils";
import { formatRelativeTime } from "../../recency";
import ProjectSettingsForm from "../../ProjectSettingsForm";
import AddToCollectionForm from "../../AddToCollectionForm";
import type { ProjectWithSettings, Preferences, Accessory } from "../types";

interface ProjectListItemProps {
  project: ProjectWithSettings;
  isAutoGroup: boolean;
  collectionMap: Map<string, { name: string; icon?: string; color?: string }>;
  preferences: Preferences;
  onOpen: (
    project: ProjectWithSettings,
  ) => Promise<{ action: string; project?: ProjectWithSettings }>;
  onDelete: (project: ProjectWithSettings) => Promise<void>;
  onDeleteFromExtension: (project: ProjectWithSettings) => Promise<void>;
  onReload: () => void;
}

function getCollectionAccessories(
  project: ProjectWithSettings,
  collectionMap: Map<string, { name: string; icon?: string; color?: string }>,
): Accessory[] {
  if (!project.collections || project.collections.length === 0) return [];
  const accessories: Accessory[] = [];

  for (const id of project.collections) {
    const coll = collectionMap.get(id);
    if (!coll) continue;
    if (coll.icon) {
      const iconSource = Icon[coll.icon as keyof typeof Icon];
      accessories.push({
        icon: { source: iconSource, tintColor: coll.color },
        text: coll.name,
        tooltip: coll.name,
      });
    } else {
      accessories.push({ text: coll.name, tooltip: coll.name });
    }
  }
  return accessories;
}

function getProjectAccessories(
  project: ProjectWithSettings,
  isAutoGroup: boolean,
  collectionMap: Map<string, { name: string; icon?: string; color?: string }>,
): Accessory[] {
  const accessories: Accessory[] = [];

  if (isAutoGroup) {
    accessories.push(...getCollectionAccessories(project, collectionMap));
  }

  const relativeTime = formatRelativeTime(project.lastOpened);

  if (!project.missing && relativeTime) {
    accessories.push({ text: relativeTime });
  }

  if (project.missing) {
    accessories.push({
      text: "Not found",
      icon: { source: Icon.Warning, tintColor: Color.Red },
    });
  }

  if (!project.missing && project.hasInvalidIde) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      tooltip: `IDE not found: ${project.settings.ide?.name || "Unknown"}`,
    });
  }

  return accessories;
}

export function ProjectListItem({
  project,
  isAutoGroup,
  collectionMap,
  preferences,
  onOpen,
  onDelete,
  onDeleteFromExtension,
  onReload,
}: ProjectListItemProps) {
  const { push } = useNavigation();

  const handleOpen = async () => {
    const result = await onOpen(project);
    if (result.action === "openSettings" && result.project) {
      push(
        <ProjectSettingsForm
          projectPath={result.project.path}
          projectName={result.project.name}
          onSave={onReload}
        />,
      );
    }
  };

  const handleRelocate = () => {
    push(
      <Form
        navigationTitle="Relocate Project"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Relocate"
              onSubmit={async (values: { newPath: string[] }) => {
                const newPath = values.newPath?.[0];
                if (!newPath) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "No directory selected",
                  });
                  return;
                }

                if (!isProject(newPath)) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Invalid project directory",
                    message: "Selected folder is not a recognized project",
                  });
                  return;
                }

                migrateProjectSettings(project.path, newPath);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Project relocated",
                  message: `Moved settings to ${newPath}`,
                });
                onReload();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Missing Project"
          text={`The project "${project.settings.displayName || project.name}" was not found at:\n${project.path}\n\nSelect the new location:`}
        />
        <Form.FilePicker
          id="newPath"
          title="New Location"
          allowMultipleSelection={false}
          canChooseDirectories={true}
          canChooseFiles={false}
        />
      </Form>,
    );
  };

  if (project.missing) {
    return (
      <List.Item
        key={project.path}
        title={project.settings.displayName || project.name}
        accessories={getProjectAccessories(project, isAutoGroup, collectionMap)}
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        keywords={[project.name, project.settings.displayName || ""].filter(
          Boolean,
        )}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Relocate Project…"
                icon={Icon.Folder}
                onAction={handleRelocate}
              />
              <Action
                title="Remove from Extension"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => onDeleteFromExtension(project)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Original Path"
                content={project.path}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.Item
      key={project.path}
      title={project.settings.displayName || project.name}
      accessories={getProjectAccessories(project, isAutoGroup, collectionMap)}
      icon={getProjectIcon(
        project.settings,
        project.settings.displayName || project.name,
      )}
      keywords={[project.name, project.settings.displayName || ""].filter(
        Boolean,
      )}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={`Open in ${project.settings.ide?.name || preferences.ide.name}`}
              icon={Icon.ArrowRight}
              onAction={handleOpen}
            />
            <Action.ShowInFinder path={project.path} />
            <Action.CopyToClipboard title="Copy Path" content={project.path} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Add to Collection…"
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() =>
                push(
                  <AddToCollectionForm
                    projectPath={project.path}
                    currentCollections={project.collections}
                    onSave={onReload}
                  />,
                )
              }
            />
            <Action
              title="Project Settings"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              onAction={() =>
                push(
                  <ProjectSettingsForm
                    projectPath={project.path}
                    projectName={project.name}
                    onSave={onReload}
                  />,
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Project"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => onDelete(project)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
