import {
  Keyboard,
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import {
  Workspace,
  activateWorkspace,
  activeWorkspaceId,
  currentWorkspace,
  listWorkspaces,
  normalizeServerUrl,
  removeWorkspace,
  saveWorkspace,
  workspaceIdFor,
} from "./lib/workspaces";
import { verifyWorkspace } from "./lib/workspace-setup";

type WorkspaceOwner = NonNullable<Workspace["defaultOwner"]>;

interface WorkspaceLaunchContext {
  returnCommand?: string;
  intent?: "add";
}

interface WorkspaceFormValues {
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultOwner: WorkspaceOwner;
}

const RETURN_COMMANDS = new Set([
  "search-tools",
  "integrations",
  "connections",
  "artifacts",
  "saved-tools",
  "add-connection",
  "add-integration",
  "policies",
  "approvals",
]);

function destinationCommand(requested?: string): string {
  return requested && RETURN_COMMANDS.has(requested) ? requested : "search-tools";
}

function targetLabel(workspace: Workspace): string {
  const organization = workspace.organizationSlug;
  return organization && organization.toLowerCase() !== workspace.name.toLowerCase()
    ? `${workspace.name} (${organization})`
    : workspace.name;
}

function isLegacyWorkspace(workspace: Workspace): boolean {
  return "isLegacy" in workspace && workspace.isLegacy === true;
}

async function openWorkspace(workspace: Workspace, returnCommand?: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Opening ${workspace.name}` });
  try {
    await activateWorkspace(workspace.id);
    await launchCommand({
      name: destinationCommand(returnCommand),
      type: LaunchType.UserInitiated,
      context: { workspaceId: workspace.id },
    });
    toast.hide();
  } catch (error) {
    toast.hide();
    await showFailureToast(error, { title: "Could Not Open Workspace" });
  }
}

function AddWorkspaceForm({
  isRootView = false,
  workspaces,
  returnCommand,
  onSaved,
}: {
  isRootView?: boolean;
  workspaces: Workspace[];
  returnCommand?: string;
  onSaved: () => void;
}) {
  const submitting = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const [keyError, setKeyError] = useState<string>();
  const [urlError, setUrlError] = useState<string>();
  function validateUrl(value: string): string | undefined {
    try {
      normalizeServerUrl(value);
      return undefined;
    } catch (error) {
      return (error as Error).message;
    }
  }

  async function onSubmit(values: WorkspaceFormValues) {
    if (submitting.current) return;

    const name = values.name.trim();
    const apiKey = values.apiKey.trim();
    if (!name) {
      setNameError("Enter a workspace name.");
      return;
    }
    if (!apiKey) {
      setKeyError("Enter an API key.");
      return;
    }

    let baseUrl: string;
    try {
      baseUrl = normalizeServerUrl(values.baseUrl);
    } catch (error) {
      setUrlError((error as Error).message);
      return;
    }

    const id = workspaceIdFor(baseUrl, apiKey);
    const existing = workspaces.find((workspace) => workspace.id === id);
    if (existing) {
      const sameCredentials = existing.baseUrl === baseUrl && existing.apiKey === apiKey;
      await showToast({
        style: Toast.Style.Failure,
        title: sameCredentials ? "Workspace Already Added" : "Could Not Save Workspace",
        message: sameCredentials
          ? `Rename or select ${existing.name} from the workspace list.`
          : "A different workspace already uses this profile ID.",
      });
      return;
    }

    submitting.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Verifying Workspace" });
    try {
      const verified = await verifyWorkspace({
        id,
        name,
        baseUrl,
        apiKey,
        defaultOwner: values.defaultOwner,
      });
      await saveWorkspace(verified);
      await activateWorkspace(verified.id);
      onSaved();
      toast.style = Toast.Style.Success;
      toast.title = "Workspace Added";
      toast.message = targetLabel(verified);
      await launchCommand({
        name: destinationCommand(returnCommand),
        type: LaunchType.UserInitiated,
        context: { workspaceId: verified.id },
      });
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could Not Add Workspace" });
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isRootView ? undefined : "Add Workspace"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Workspace" icon={Icon.Plus} onSubmit={onSubmit} />
          <Action.OpenInBrowser
            title="Open Executor"
            shortcut={Keyboard.Shortcut.Common.Open}
            url="https://executor.sh"
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Personal"
        autoFocus
        error={nameError}
        onBlur={(event) => setNameError(event.target.value?.trim() ? undefined : "Enter a workspace name.")}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="baseUrl"
        title="Server URL"
        placeholder="https://executor.sh"
        error={urlError}
        onBlur={(event) => setUrlError(validateUrl(event.target.value ?? ""))}
        onChange={() => setUrlError(undefined)}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Executor API key"
        error={keyError}
        onBlur={(event) => setKeyError(event.target.value?.trim() ? undefined : "Enter an API key.")}
        onChange={() => setKeyError(undefined)}
        info="In Executor, select the intended workspace and open API keys. Use a key for that workspace; each organization needs its own profile."
      />
      <Form.Dropdown id="defaultOwner" title="Connections" defaultValue="all">
        <Form.Dropdown.Item value="all" title="Both" icon={Icon.TwoPeople} />
        <Form.Dropdown.Item value="user" title="Personal" icon={Icon.Person} />
        <Form.Dropdown.Item value="org" title="Workspace" icon={Icon.TwoPeople} />
      </Form.Dropdown>
      <Form.Description text="The workspace is saved only after Executor verifies the server and API key." />
    </Form>
  );
}

function EditWorkspaceForm({ workspace, onSaved }: { workspace: Workspace; onSaved: () => void }) {
  const { pop } = useNavigation();
  const submitting = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string>();

  async function onSubmit(values: { name: string; defaultOwner?: WorkspaceOwner }) {
    if (submitting.current) return;
    const name = values.name.trim();
    if (!name) {
      setNameError("Enter a workspace name.");
      return;
    }

    submitting.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Workspace" });
    try {
      await saveWorkspace({
        ...workspace,
        name,
        defaultOwner: workspace.isLegacy ? workspace.defaultOwner : (values.defaultOwner ?? workspace.defaultOwner),
      });
      onSaved();
      toast.style = Toast.Style.Success;
      toast.title = "Workspace Saved";
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could Not Save Workspace" });
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit ${workspace.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Workspace" icon={Icon.Pencil} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={workspace.name}
        placeholder="Workspace name"
        autoFocus
        error={nameError}
        onBlur={(event) => setNameError(event.target.value?.trim() ? undefined : "Enter a workspace name.")}
        onChange={() => setNameError(undefined)}
      />
      {!workspace.isLegacy ? (
        <Form.Dropdown id="defaultOwner" title="Connections" defaultValue={workspace.defaultOwner ?? "all"}>
          <Form.Dropdown.Item value="all" title="Both" icon={Icon.TwoPeople} />
          <Form.Dropdown.Item value="user" title="Personal" icon={Icon.Person} />
          <Form.Dropdown.Item value="org" title="Workspace" icon={Icon.TwoPeople} />
        </Form.Dropdown>
      ) : (
        <Form.Description
          title="Connections"
          text="Change this workspace's connection filter in Extension Preferences."
        />
      )}

      <Form.Description
        title="Executor Workspace"
        text={`${targetLabel(workspace)} at ${workspace.baseUrl}. Credentials remain unchanged.`}
      />
    </Form>
  );
}

export default function ManageWorkspaces({
  launchContext,
  isRootView = true,
}: { launchContext?: WorkspaceLaunchContext; isRootView?: boolean } = {}) {
  const { pop } = useNavigation();
  const deleting = useRef(new Set<string>());
  const verifying = useRef(new Set<string>());
  const switching = useRef(false);
  const { data, isLoading, error, revalidate } = usePromise(
    async () => {
      const [workspaces, activeId] = await Promise.all([listWorkspaces(), activeWorkspaceId()]);
      return { workspaces, activeId };
    },
    [],
    {
      failureToastOptions: { title: "Could Not Load Workspaces" },
    },
  );

  const workspaces = data?.workspaces ?? [];
  const commandWorkspaceId = !isRootView ? currentWorkspace()?.id : undefined;
  const activeId = commandWorkspaceId ?? data?.activeId ?? workspaces[0]?.id;
  const returnCommand = launchContext?.returnCommand;

  async function onSwitch(workspace: Workspace) {
    if (switching.current) return;
    switching.current = true;
    try {
      if (!isRootView) {
        if (workspace.id === commandWorkspaceId) pop();
        else await openWorkspace(workspace, returnCommand);
        return;
      }
      await activateWorkspace(workspace.id);
      await revalidate();
      await showToast({ style: Toast.Style.Success, title: `Switched to ${workspace.name}` });
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Switch Workspace" });
    } finally {
      switching.current = false;
    }
  }

  async function onRemove(workspace: Workspace) {
    if (isLegacyWorkspace(workspace)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Preferences Workspace Cannot Be Removed Here",
        message: "Update its server and API key in Extension Preferences.",
      });
      return;
    }
    if (deleting.current.has(workspace.id)) return;

    const confirmed = await confirmAlert({
      title: `Remove “${workspace.name}”?`,
      message: `This removes the local profile for ${targetLabel(workspace)}. It does not change the Executor account.`,
      icon: Icon.Trash,
      primaryAction: { title: "Remove Workspace", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed || deleting.current.has(workspace.id)) return;

    deleting.current.add(workspace.id);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing Workspace" });
    try {
      await removeWorkspace(workspace.id);
      revalidate();
      toast.style = Toast.Style.Success;
      toast.title = "Workspace Removed";
    } catch (removeError) {
      toast.hide();
      await showFailureToast(removeError, { title: "Could Not Remove Workspace" });
    } finally {
      deleting.current.delete(workspace.id);
    }
  }

  async function onVerify(workspace: Workspace) {
    if (verifying.current.has(workspace.id)) return;
    verifying.current.add(workspace.id);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Verifying Workspace" });
    try {
      const verified = await verifyWorkspace(workspace);
      await saveWorkspace(verified);
      revalidate();
      toast.style = Toast.Style.Success;
      toast.title = "Workspace Verified";
      toast.message = targetLabel(verified);
    } catch (verifyError) {
      toast.hide();
      await showFailureToast(verifyError, { title: "Could Not Verify Workspace" });
    } finally {
      verifying.current.delete(workspace.id);
    }
  }

  const addWorkspace = (
    <AddWorkspaceForm
      isRootView={isRootView && launchContext?.intent === "add"}
      workspaces={workspaces}
      returnCommand={returnCommand}
      onSaved={() => revalidate()}
    />
  );

  if (launchContext?.intent === "add" && data) return addWorkspace;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={isRootView ? undefined : "Switch Workspace"}
      searchBarPlaceholder="Search workspaces by name, organization, or server"
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Building}
        title={error ? "Could Not Load Workspaces" : "No Workspaces Added"}
        description={error ? error.message : "Add an Executor server and API key to get started."}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Workspace"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={addWorkspace}
            />
            <Action
              shortcut={Keyboard.Shortcut.Common.Refresh}
              title="Reload Workspaces"
              icon={Icon.RotateClockwise}
              onAction={() => revalidate()}
            />
          </ActionPanel>
        }
      />
      {workspaces.map((workspace) => {
        const isActive = workspace.id === activeId;
        return (
          <List.Item
            key={workspace.id}
            id={workspace.id}
            title={workspace.name}
            subtitle={workspace.baseUrl}
            keywords={[workspace.organizationSlug ?? "", workspace.baseUrl]}
            icon={{ source: workspace.defaultOwner === "org" ? Icon.Building : Icon.Globe, tintColor: Color.Blue }}
            accessories={isActive ? [{ tag: { value: "Active", color: Color.Green } }] : []}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={isActive ? `Open ${workspace.name}` : `Switch to ${workspace.name}`}
                    shortcut={isActive ? Keyboard.Shortcut.Common.Open : undefined}
                    icon={isActive ? Icon.CheckCircle : Icon.ArrowRight}
                    onAction={() =>
                      isRootView && isActive ? openWorkspace(workspace, returnCommand) : onSwitch(workspace)
                    }
                  />
                  {!isActive ? (
                    <Action
                      title={`Open ${workspace.name}`}
                      icon={Icon.ArrowRight}
                      shortcut={Keyboard.Shortcut.Common.Open}
                      onAction={() => openWorkspace(workspace, returnCommand)}
                    />
                  ) : null}
                  <Action.Push
                    title="Add Workspace"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={addWorkspace}
                  />
                  <Action.Push
                    title="Edit Workspace"
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    icon={Icon.Pencil}
                    target={<EditWorkspaceForm workspace={workspace} onSaved={() => revalidate()} />}
                  />
                  {isLegacyWorkspace(workspace) ? (
                    <Action title="Verify Workspace" icon={Icon.CheckCircle} onAction={() => onVerify(workspace)} />
                  ) : null}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    title="Reload Workspaces"
                    icon={Icon.RotateClockwise}
                    onAction={() => revalidate()}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  {isLegacyWorkspace(workspace) ? (
                    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  ) : (
                    <Action
                      title="Remove Workspace"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => onRemove(workspace)}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
