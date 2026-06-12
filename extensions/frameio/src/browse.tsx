import { JSX, useEffect, useRef, useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Alert,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { authorize, logout } from "./auth";
import { loadClientId } from "./client-id";
import { SetupGuide } from "./components/SetupGuide";
import { debug } from "./debug";
import {
  listAccounts,
  listWorkspaces,
  listProjects,
  tryGetFolder,
  tryFindProjectById,
  Account,
  Workspace,
  Project,
} from "./api/frameio";
import { FolderView } from "./components/FolderView";

type ViewState =
  | { stage: "loading" }
  | { stage: "workspaces"; account: Account; workspaces: Workspace[] }
  | { stage: "projects"; account: Account; workspace: Workspace; projects: Project[]; workspaces: Workspace[] };

export default function BrowseCommand(): JSX.Element {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    loadClientId().then((id) => setReady(Boolean(id)));
  }, []);

  if (ready === null) return <List isLoading />;
  if (!ready) return <SetupGuide onComplete={() => setReady(true)} />;

  return <BrowseCommandMain onDisconnect={() => setReady(false)} />;
}

function BrowseCommandMain({ onDisconnect }: { onDisconnect: () => void }): JSX.Element {
  const { push } = useNavigation();
  const [state, setState] = useState<ViewState>({ stage: "loading" });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const defaultOpenedRef = useRef(false);

  const showWorkspaces = (account: Account, workspaces: Workspace[]) => {
    setState({ stage: "workspaces", account, workspaces });
  };

  useEffect(() => {
    async function init() {
      try {
        debug.info("Initializing Browse…");
        await authorize();

        const accounts = await listAccounts();
        if (accounts.length === 0) throw new Error("No Frame.io account found for this user.");
        const account = accounts[0];
        const workspaces = await listWorkspaces(account.id);

        setState({ stage: "workspaces", account, workspaces });
      } catch (error) {
        debug.error("Browse initialization failed", error);
        showToast({ style: Toast.Style.Failure, title: "Initialization Error", message: String(error) });
        setState({ stage: "workspaces", account: {} as Account, workspaces: [] });
      } finally {
        setIsAuthLoading(false);
      }
    }
    init();
  }, []);

  // Open default location from extension preferences (once, after workspaces are ready).
  // Supports workspace IDs, project IDs, and folder IDs.
  useEffect(() => {
    if (defaultOpenedRef.current || isAuthLoading || state.stage !== "workspaces") return;

    const prefs = getPreferenceValues<Preferences>();
    const defaultId = (prefs.defaultFolderId ?? "").trim();
    if (!defaultId) return;

    defaultOpenedRef.current = true;
    const { account, workspaces } = state;

    async function resolveAndOpen() {
      // 1. Workspace ID — check against already-loaded list (no extra API call)
      const matchedWorkspace = workspaces.find((w) => w.id === defaultId);
      if (matchedWorkspace) {
        const projects = await listProjects(account.id, matchedWorkspace.id);
        setState({ stage: "projects", account, workspace: matchedWorkspace, projects, workspaces });
        debug.info(`Opened default workspace: ${matchedWorkspace.name}`);
        return;
      }

      // 2. Folder ID
      const folder = await tryGetFolder(account.id, defaultId);
      if (folder) {
        push(
          <FolderView
            accountId={account.id}
            folderId={defaultId}
            title={folder.name}
            isPushedView={true}
            onBrowseWorkspaces={() => showWorkspaces(account, workspaces)}
          />
        );
        debug.info(`Opened default folder: ${folder.name}`);
        return;
      }

      // 3. Project ID — scan workspaces' project lists
      const result = await tryFindProjectById(account.id, defaultId, workspaces);
      if (result) {
        push(
          <FolderView
            accountId={account.id}
            folderId={result.project.root_folder_id}
            title={result.project.name}
            isPushedView={true}
            onBrowseWorkspaces={() => showWorkspaces(account, workspaces)}
          />
        );
        debug.info(`Opened default project: ${result.project.name}`);
        return;
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Default Location Not Found",
        message:
          "The ID in Extension Preferences → Browse Default Folder ID is not a valid workspace, project, or folder.",
      });
    }

    resolveAndOpen().catch((err) =>
      showToast({ style: Toast.Style.Failure, title: "Default Location Error", message: String(err) })
    );
  }, [isAuthLoading, state, push]);

  if (isAuthLoading || state.stage === "loading") return <List isLoading />;

  if (state.stage === "workspaces") {
    return (
      <WorkspaceList
        account={state.account}
        workspaces={state.workspaces}
        onDisconnect={onDisconnect}
        onSelect={(workspace) => {
          listProjects(state.account.id, workspace.id)
            .then((projects) =>
              setState({
                stage: "projects",
                account: state.account,
                workspace,
                projects,
                workspaces: state.workspaces,
              })
            )
            .catch((err) => showToast({ style: Toast.Style.Failure, title: "Error", message: String(err) }));
        }}
      />
    );
  }

  if (state.stage === "projects") {
    const { account, workspace, projects, workspaces } = state;
    return (
      <ProjectList
        account={account}
        workspace={workspace}
        projects={projects}
        onSelect={(project) => {
          push(
            <FolderView
              accountId={account.id}
              folderId={project.root_folder_id}
              title={`${workspace.name} / ${project.name}`}
              navigationContext={{
                workspaceId: workspace.id,
                workspaceName: workspace.name,
                projectId: project.id,
                projectName: project.name,
              }}
              isPushedView={true}
              onBrowseWorkspaces={() => showWorkspaces(account, workspaces)}
            />
          );
        }}
        onBrowseWorkspaces={() => showWorkspaces(account, workspaces)}
      />
    );
  }

  return <List isLoading />;
}

// ─── WorkspaceList ─────────────────────────────────────────────────────────────

interface WorkspaceListProps {
  account: Account;
  workspaces: Workspace[];
  onSelect: (workspace: Workspace) => void;
  onDisconnect: () => void;
}

function WorkspaceList({ account, workspaces, onSelect, onDisconnect }: WorkspaceListProps): JSX.Element {
  const handleDisconnect = async () => {
    const confirmed = await confirmAlert({
      title: "Disconnect From Frame.io?",
      message: "You will need to go through the setup again the next time you use the extension.",
      primaryAction: { title: "Disconnect", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await logout();
    onDisconnect();
  };

  return (
    <List searchBarPlaceholder="Filter workspaces…">
      {workspaces.length === 0 && (
        <List.EmptyView
          title="No Workspaces"
          description="No workspaces are accessible via the API for this account."
          icon={Icon.ExclamationMark}
        />
      )}
      <List.Section title={`Account: ${account.display_name}`}>
        {workspaces.map((ws) => (
          <List.Item
            key={ws.id}
            title={ws.name}
            icon={Icon.Building}
            accessories={[{ date: new Date(ws.updated_at), tooltip: "Last modified" }]}
            actions={
              <ActionPanel>
                <Action title="Open Workspace" icon={Icon.ArrowRight} onAction={() => onSelect(ws)} />
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title={`Copy "${ws.name}" ID`}
                    content={ws.id}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onCopy={() =>
                      showToast({
                        style: Toast.Style.Success,
                        title: "Workspace ID Copied",
                        message: "Paste it in Extension Preferences → Browse Default Folder ID",
                      })
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  <Action
                    title="Disconnect from Frame.io"
                    icon={Icon.Logout}
                    style={Action.Style.Destructive}
                    onAction={handleDisconnect}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// ─── ProjectList ───────────────────────────────────────────────────────────────

interface ProjectListProps {
  account: Account;
  workspace: Workspace;
  projects: Project[];
  onSelect: (project: Project) => void;
  onBrowseWorkspaces: () => void;
}

function ProjectList({ account, workspace, projects, onSelect, onBrowseWorkspaces }: ProjectListProps): JSX.Element {
  return (
    <List searchBarPlaceholder="Filter projects…">
      {projects.length === 0 && (
        <List.EmptyView
          title="No Projects"
          description="This workspace has no accessible projects."
          icon={Icon.ExclamationMark}
        />
      )}
      <List.Section title={`${account.display_name} / ${workspace.name}`}>
        {projects.map((project) => (
          <List.Item
            key={project.id}
            title={project.name}
            icon={Icon.Folder}
            accessories={[{ date: new Date(project.updated_at), tooltip: "Last modified" }]}
            actions={
              <ActionPanel>
                <Action title="Open Project" icon={Icon.ArrowRight} onAction={() => onSelect(project)} />
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title={`Copy "${project.name}" ID`}
                    content={project.id}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onCopy={() =>
                      showToast({
                        style: Toast.Style.Success,
                        title: "Project ID Copied",
                        message: "Paste it in Extension Preferences → Browse Default Folder ID",
                      })
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Browse Workspaces"
                    icon={Icon.Building}
                    onAction={onBrowseWorkspaces}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                  />
                  <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
