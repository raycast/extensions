import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getAccessTokenContext } from "./auth";
import {
  getGoogleAuthStatus,
  hasAdcCredentials,
  revokeAdcCredentials,
} from "./google-auth";
import { listAccessibleFirebaseProjects } from "./firebase-management-client";
import { csvToList, listToCsv } from "./formatting";
import { getRemoteConfigTemplate } from "./remote-config-client";
import {
  clearLocalData,
  deleteGroup,
  deleteProject,
  getGroups,
  getProjects,
  mergeImportedProjects,
  upsertGroup,
  upsertProject,
} from "./storage";
import type { GoogleAuthStatus, ProjectConfig, ProjectGroup } from "./types";

async function loadRegistry() {
  const [projects, groups, auth, adcAvailable] = await Promise.all([
    getProjects(),
    getGroups(),
    getGoogleAuthStatus(),
    hasAdcCredentials(),
  ]);
  return { projects, groups, auth, adcAvailable };
}

interface ProjectFormValues {
  projectId: string;
  displayName: string;
  credentialRef?: string;
  tags?: string;
  enabled: boolean;
}

function ProjectForm({
  project,
  onSaved,
}: {
  project?: ProjectConfig;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={project ? "Save Project" : "Add Project"}
            onSubmit={async (rawValues) => {
              const values = rawValues as ProjectFormValues;
              try {
                const saved = await upsertProject({
                  id: project?.id ?? "",
                  projectId: values.projectId,
                  displayName: values.displayName,
                  credentialRef: values.credentialRef?.trim() || undefined,
                  tags: csvToList(values.tags ?? ""),
                  enabled: values.enabled ?? true,
                });
                onSaved();
                pop();
                if (saved.credentialRef) {
                  try {
                    await showToast({
                      style: Toast.Style.Animated,
                      title: "Validating credentials...",
                    });
                    const { authMethod } = await getAccessTokenContext(saved);
                    await getRemoteConfigTemplate(saved);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Project saved and verified",
                      message: `Authenticated via ${authMethod}`,
                    });
                  } catch {
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Project saved",
                      message:
                        "Credentials could not be verified. You can test the connection later.",
                    });
                  }
                }
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to save project",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="projectId"
        title="Firebase Project ID"
        defaultValue={project?.projectId}
      />
      <Form.TextField
        id="displayName"
        title="Display Name"
        defaultValue={project?.displayName}
      />
      <Form.TextField
        id="credentialRef"
        title="Service Account JSON Path"
        defaultValue={project?.credentialRef}
        placeholder="~/path/to/service-account.json"
      />
      <Form.TextField
        id="tags"
        title="Tags"
        defaultValue={listToCsv(project?.tags ?? [])}
        placeholder="prod, ios, shopping"
      />
      <Form.Checkbox
        id="enabled"
        title="Enabled"
        label="Project enabled for list/query/publish"
        defaultValue={project?.enabled ?? true}
      />
    </Form>
  );
}

interface GroupFormValues {
  name: string;
  projectIds: string[];
}

function GroupForm({
  group,
  projects,
  onSaved,
}: {
  group?: ProjectGroup;
  projects: ProjectConfig[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={group ? "Save Group" : "Add Group"}
            onSubmit={async (rawValues) => {
              const values = rawValues as GroupFormValues;
              try {
                await upsertGroup({
                  id: group?.id ?? "",
                  name: values.name,
                  projectIds: values.projectIds ?? [],
                });
                onSaved();
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to save group",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Group Name" defaultValue={group?.name} />
      <Form.TagPicker
        id="projectIds"
        title="Projects"
        defaultValue={group?.projectIds ?? []}
      >
        {projects.map((project) => (
          <Form.TagPicker.Item
            key={project.id}
            value={project.id}
            title={project.displayName}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default function ManageProjectsCommand() {
  const { data, isLoading, revalidate } = useCachedPromise(loadRegistry, [], {
    keepPreviousData: true,
  });

  const projects = data?.projects ?? [];
  const groups = data?.groups ?? [];
  const auth = data?.auth ?? ({ isLoggedIn: false } satisfies GoogleAuthStatus);
  const adcAvailable = data?.adcAvailable ?? false;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects and groups"
    >
      <List.Section title="Google Account">
        <List.Item
          icon={auth.isLoggedIn ? Icon.CheckCircle : Icon.Person}
          title={auth.isLoggedIn ? auth.email || "Connected" : "Not Signed In"}
          subtitle={
            auth.isLoggedIn
              ? auth.name ||
                "Signed in via Application Default Credentials. You can import Firebase projects."
              : "Run `gcloud auth application-default login` in your terminal, then return here."
          }
          accessories={
            auth.isLoggedIn ? [{ text: "ADC" }] : [{ text: "ADC missing" }]
          }
          actions={
            <ActionPanel>
              {auth.isLoggedIn ? (
                <Action
                  title="Import Firebase Projects"
                  icon={Icon.Download}
                  onAction={async () => {
                    try {
                      const imported = await listAccessibleFirebaseProjects();
                      const result = await mergeImportedProjects(imported);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Projects imported",
                        message: `Added ${result.added}, updated ${result.updated}`,
                      });
                      revalidate();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Import failed",
                        message:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    }
                  }}
                />
              ) : (
                <Action
                  title="Copy Sign-In Command"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    const command = "gcloud auth application-default login";
                    await Clipboard.copy(command);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Command copied",
                      message: `Paste "${command}" in your terminal to sign in.`,
                    });
                  }}
                />
              )}
              {auth.isLoggedIn ||
              adcAvailable ||
              projects.length > 0 ||
              groups.length > 0 ? (
                <Action
                  title="Sign out"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Sign out?",
                      message:
                        "This clears every saved project and group and revokes your Application Default Credentials (affecting any other tool on this machine that relies on ADC). Service account JSON files on disk are not touched.",
                      primaryAction: {
                        title: "Sign Out",
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                    if (!confirmed) return;
                    try {
                      await clearLocalData();
                      if (adcAvailable) {
                        await revokeAdcCredentials();
                      }
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Signed out",
                        message: "Extension returned to initial state.",
                      });
                      revalidate();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Sign-out failed",
                        message:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    }
                  }}
                />
              ) : null}
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Projects (${projects.length})`}>
        {projects.map((project) => (
          <List.Item
            key={project.id}
            icon={project.enabled ? Icon.Dot : Icon.CircleDisabled}
            title={project.displayName}
            subtitle={project.projectId}
            accessories={[
              ...(project.credentialRef ? [{ text: "credentialRef" }] : []),
              ...(!project.credentialRef && project.source === "google-import"
                ? [{ text: "google" }]
                : []),
              ...(project.tags.length > 0 ? [{ text: project.tags[0] }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Import Firebase Projects"
                  icon={Icon.Download}
                  onAction={async () => {
                    try {
                      const imported = await listAccessibleFirebaseProjects();
                      const result = await mergeImportedProjects(imported);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Projects imported",
                        message: `Added ${result.added}, updated ${result.updated}`,
                      });
                      revalidate();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Import failed",
                        message:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    }
                  }}
                />
                <Action.Push
                  title="Edit Project"
                  icon={Icon.Pencil}
                  target={
                    <ProjectForm project={project} onSaved={revalidate} />
                  }
                />
                <Action
                  title="Test Connection"
                  icon={Icon.CheckCircle}
                  onAction={async () => {
                    try {
                      await showToast({
                        style: Toast.Style.Animated,
                        title: "Testing connection...",
                      });
                      const { authMethod } =
                        await getAccessTokenContext(project);
                      await getRemoteConfigTemplate(project);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Connection successful",
                        message: `${project.displayName} authenticated via ${authMethod}`,
                      });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Connection failed",
                        message:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    }
                  }}
                />
                <Action
                  title="Delete Project"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Delete project?",
                      message: `${project.displayName} will be removed from the local registry.`,
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                    if (!confirmed) return;
                    await deleteProject(project.id);
                    revalidate();
                  }}
                />
                <Action.Push
                  title="Add Project"
                  icon={Icon.Plus}
                  target={<ProjectForm onSaved={revalidate} />}
                />
                <Action.Push
                  title="Add Group"
                  icon={Icon.PlusCircle}
                  target={
                    <GroupForm projects={projects} onSaved={revalidate} />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={`Groups (${groups.length})`}>
        {groups.map((group) => (
          <List.Item
            key={group.id}
            icon={Icon.AppWindowGrid2x2}
            title={group.name}
            subtitle={`${group.projectIds.length} projects`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Group"
                  icon={Icon.Pencil}
                  target={
                    <GroupForm
                      group={group}
                      projects={projects}
                      onSaved={revalidate}
                    />
                  }
                />
                <Action
                  title="Delete Group"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Delete group?",
                      message: `${group.name} will be removed.`,
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                    if (!confirmed) return;
                    await deleteGroup(group.id);
                    revalidate();
                  }}
                />
                <Action.Push
                  title="Add Group"
                  icon={Icon.PlusCircle}
                  target={
                    <GroupForm projects={projects} onSaved={revalidate} />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {!isLoading && projects.length === 0 ? (
        <List.EmptyView
          icon={Icon.PlusCircle}
          title="No Firebase projects saved"
          description="Add projects with projectId, displayName, and credentialRef first."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Project"
                icon={Icon.Plus}
                target={<ProjectForm onSaved={revalidate} />}
              />
              {adcAvailable ? (
                <Action
                  title="Import Firebase Projects"
                  icon={Icon.Download}
                  onAction={async () => {
                    try {
                      const imported = await listAccessibleFirebaseProjects();
                      const result = await mergeImportedProjects(imported);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Projects imported",
                        message: `Added ${result.added}, updated ${result.updated}`,
                      });
                      revalidate();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Import failed",
                        message:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    }
                  }}
                />
              ) : (
                <Action
                  title="Copy Sign-In Command"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    const command = "gcloud auth application-default login";
                    await Clipboard.copy(command);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Command copied",
                      message: `Paste "${command}" in your terminal to sign in.`,
                    });
                  }}
                />
              )}
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
