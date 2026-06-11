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
import { debug } from "./debug";
import { listAccounts, listWorkspaces, listProjects, Account, Workspace, Project } from "./api/frameio";
import { FolderView } from "./components/FolderView";
import { RequireClientId } from "./components/RequireClientId";

type ViewState =
  | { stage: "loading" }
  | { stage: "workspaces"; account: Account; workspaces: Workspace[] }
  | { stage: "projects"; account: Account; workspace: Workspace; projects: Project[]; workspaces: Workspace[] };

export default function BrowseCommand(): JSX.Element {
  return (
    <RequireClientId>
      <BrowseCommandMain />
    </RequireClientId>
  );
}

function BrowseCommandMain(): JSX.Element {
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

  // Open default folder from extension preferences (once, after workspaces are ready)
  useEffect(() => {
    if (defaultOpenedRef.current || isAuthLoading || state.stage !== "workspaces") return;

    const prefs = getPreferenceValues<{ defaultFolderId?: string }>();
    const defaultId = (prefs.defaultFolderId ?? "").trim();
    if (!defaultId) return;

    defaultOpenedRef.current = true;
    const { account, workspaces } = state;

    push(
      <FolderView
        accountId={account.id}
        folderId={defaultId}
        title="Default Location"
        isPushedView={true}
        onBrowseWorkspaces={() => showWorkspaces(account, workspaces)}
      />
    );
    debug.info(`Opened default location from preference: ${defaultId}`);
  }, [isAuthLoading, state, push]);

  if (isAuthLoading || state.stage === "loading") return <List isLoading />;

  if (state.stage === "workspaces") {
    return (
      <WorkspaceList
        account={state.account}
        workspaces={state.workspaces}
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
}

function WorkspaceList({ account, workspaces, onSelect }: WorkspaceListProps): JSX.Element {
  const handleDisconnect = async () => {
    const confirmed = await confirmAlert({
      title: "Disconnect From Frame.io?",
      message: "You will need to sign in with Adobe again the next time you use the extension.",
      primaryAction: { title: "Disconnect", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await logout();
    await showToast({ style: Toast.Style.Success, title: "Disconnected From Frame.io" });
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
                    title="Copy Workspace ID"
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
                    title="Copy Project Folder ID"
                    content={project.root_folder_id}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onCopy={() =>
                      showToast({
                        style: Toast.Style.Success,
                        title: "Project Folder ID Copied",
                        message: "Paste it in Extension Preferences → Browse Default Folder ID",
                      })
                    }
                  />
                  <Action.CopyToClipboard title="Copy Project ID" content={project.id} />
                  <Action.CopyToClipboard title="Copy Workspace ID" content={workspace.id} />
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
