import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { useMemo, useState } from "react";

const DB_PATH = path.join(homedir(), "Library", "Application Support", "com.conductor.app", "conductor.db");
const WORKSPACES_ROOT = path.join(homedir(), "conductor", "workspaces");

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = useMemo(() => buildQuery(searchText), [searchText]);
  const { data, isLoading, permissionView } = useSQL<RepoRow>(DB_PATH, query, {
    permissionPriming: "Allow Raycast to read Conductor's repository database.",
  });

  if (permissionView) {
    return permissionView;
  }

  const repos = data ?? [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search repositories..."
      throttle
    >
      <List.Section title="Repositories" subtitle={`${repos.length}`}>
        {repos.map((repo) => (
          <RepoListItem key={repo.id} repo={repo} />
        ))}
      </List.Section>
      {!isLoading && repos.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No repositories found" description="Try another query." />
      ) : null}
    </List>
  );
}

function RepoListItem({ repo }: { repo: RepoRow }) {
  const accessories: List.Item.Accessory[] = [];
  if (repo.default_branch) {
    accessories.push({ tag: repo.default_branch });
  }

  const keywords = [repo.name, repo.root_path, repo.remote_url, repo.remote].filter(Boolean) as string[];

  return (
    <List.Item
      title={repo.name || repo.root_path}
      subtitle={repo.root_path}
      accessories={accessories}
      keywords={keywords}
      icon={Icon.Folder}
      actions={<RepoActions repo={repo} />}
    />
  );
}

function RepoActions({ repo }: { repo: RepoRow }) {
  const repoWorkspaces = <RepoWorkspaces repo={repo} />;

  if (!repo.root_path) {
    return (
      <ActionPanel>
        <Action.Push title="View Workspaces" target={repoWorkspaces} />
        <Action.CopyToClipboard title="Copy Repository ID" content={repo.id} />
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Workspaces">
        <Action.Push title="View Workspaces" target={repoWorkspaces} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Conductor">
        <Action.Open
          title="Create Workspace in Conductor"
          target={repo.root_path}
          application="Conductor"
          icon={Icon.Plus}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Open title="Open Repository Folder" target={repo.root_path} />
        <Action.ShowInFinder path={repo.root_path} />
        <Action.CopyToClipboard title="Copy Repository Path" content={repo.root_path} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Open in Editor">
        <Action.Open title="Open in Zed" target={repo.root_path} application="Zed" />
        <Action.Open title="Open in Cursor" target={repo.root_path} application="Cursor" />
        <Action.Open title="Open in VS Code" target={repo.root_path} application="Visual Studio Code" />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function buildQuery(searchText: string) {
  const trimmed = searchText.trim();
  const baseQuery = `
    SELECT
      id,
      name,
      root_path,
      default_branch,
      remote_url,
      remote,
      created_at,
      updated_at
    FROM repos
  `;

  if (!trimmed) {
    return `${baseQuery} ORDER BY updated_at DESC`;
  }

  const escaped = trimmed.replace(/'/g, "''");
  const like = `%${escaped}%`;
  return `
    ${baseQuery}
    WHERE
      name LIKE '${like}' OR
      root_path LIKE '${like}' OR
      remote_url LIKE '${like}' OR
      remote LIKE '${like}'
    ORDER BY updated_at DESC
  `;
}

type RepoRow = {
  id: string;
  name: string | null;
  root_path: string | null;
  default_branch: string | null;
  remote_url: string | null;
  remote: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function RepoWorkspaces({ repo }: { repo: RepoRow }) {
  const [searchText, setSearchText] = useState("");
  const query = useMemo(() => buildWorkspaceQuery(repo.id, searchText), [repo.id, searchText]);
  const { data, isLoading, permissionView } = useSQL<WorkspaceRow>(DB_PATH, query, {
    permissionPriming: "Allow Raycast to read Conductor's workspace database.",
  });

  if (permissionView) {
    return permissionView;
  }

  const workspaces = useMemo(() => (data ?? []).map(enrichWorkspace), [data]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Filter ${repo.name ?? "repository"} workspaces...`}
      throttle
    >
      <List.Section title={repo.name ?? "Workspaces"} subtitle={`${workspaces.length}`}>
        {workspaces.map((workspace) => (
          <WorkspaceListItem key={workspace.id} workspace={workspace} />
        ))}
      </List.Section>
      {!isLoading && workspaces.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No workspaces found" description="Try another query." />
      ) : null}
    </List>
  );
}

function buildWorkspaceQuery(repoId: string, searchText: string) {
  const trimmed = searchText.trim();
  const repoIdEscaped = repoId.replace(/'/g, "''");
  const baseQuery = `
    SELECT
      w.id,
      r.name AS repo,
      r.root_path AS repo_path,
      w.directory_name,
      w.branch,
      w.state,
      w.created_at,
      w.updated_at,
      s.status AS session_status,
      s.is_compacting AS session_is_compacting,
      s.updated_at AS session_updated_at
    FROM workspaces w
    LEFT JOIN repos r ON r.id = w.repository_id
    LEFT JOIN sessions s ON s.id = w.active_session_id
  `;

  const notArchivedClause = "w.state IS NULL OR w.state != 'archived'";
  const repoClause = `w.repository_id = '${repoIdEscaped}'`;

  if (!trimmed) {
    return `${baseQuery} WHERE (${repoClause}) AND (${notArchivedClause}) ORDER BY w.updated_at DESC`;
  }

  const escaped = trimmed.replace(/'/g, "''");
  const like = `%${escaped}%`;
  return `
    ${baseQuery}
    WHERE
      (${repoClause}) AND (${notArchivedClause}) AND (
        w.branch LIKE '${like}' OR
        w.directory_name LIKE '${like}' OR
        r.name LIKE '${like}' OR
        w.state LIKE '${like}'
      )
    ORDER BY w.updated_at DESC
  `;
}

function WorkspaceListItem({ workspace }: { workspace: Workspace }) {
  const title = workspace.branch || workspace.directoryName || workspace.id;
  const subtitleParts = [workspace.repo, workspace.directoryName].filter(Boolean) as string[];
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" - ") : undefined;
  const accessories: List.Item.Accessory[] = [];

  if (workspace.state) {
    accessories.push({
      tag: {
        value: workspace.state,
        color: workspace.state === "archived" ? Color.SecondaryText : Color.Green,
      },
    });
  }

  if (workspace.updatedAt) {
    accessories.push({ date: workspace.updatedAt });
  }

  const keywords = [
    workspace.repo,
    workspace.directoryName,
    workspace.branch,
    workspace.state,
    workspace.sessionStatus,
  ].filter(Boolean) as string[];

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={accessories}
      icon={getWorkspaceIcon(workspace)}
      keywords={keywords}
      actions={<WorkspaceActions workspace={workspace} />}
    />
  );
}

function WorkspaceActions({ workspace }: { workspace: Workspace }) {
  const openTargetPath = workspace.workspacePath ?? workspace.repoPath;

  if (workspace.workspacePath) {
    return (
      <ActionPanel>
        <Action.Open title="Open in Conductor" target={workspace.workspacePath} application="Conductor" />
        <Action.Open title="Open Workspace Folder" target={workspace.workspacePath} />
        <Action.ShowInFinder path={workspace.workspacePath} />
        <Action.CopyToClipboard title="Copy Workspace Path" content={workspace.workspacePath} />
        {openTargetPath ? (
          <ActionPanel.Section title="Open in Editor">
            <Action.Open title="Open in Zed" target={openTargetPath} application="Zed" />
            <Action.Open title="Open in Cursor" target={openTargetPath} application="Cursor" />
            <Action.Open title="Open in VS Code" target={openTargetPath} application="Visual Studio Code" />
          </ActionPanel.Section>
        ) : null}
      </ActionPanel>
    );
  }

  if (workspace.repoPath) {
    return (
      <ActionPanel>
        <Action.Open title="Open Repo in Conductor" target={workspace.repoPath} application="Conductor" />
        <Action.Open title="Open Repo Folder" target={workspace.repoPath} />
        <Action.ShowInFinder path={workspace.repoPath} />
        <Action.CopyToClipboard title="Copy Repo Path" content={workspace.repoPath} />
        <ActionPanel.Section title="Open in Editor">
          <Action.Open title="Open in Zed" target={workspace.repoPath} application="Zed" />
          <Action.Open title="Open in Cursor" target={workspace.repoPath} application="Cursor" />
          <Action.Open title="Open in VS Code" target={workspace.repoPath} application="Visual Studio Code" />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Workspace ID" content={workspace.id} />
    </ActionPanel>
  );
}

function enrichWorkspace(row: WorkspaceRow): Workspace {
  const repo = row.repo ?? undefined;
  const directoryName = row.directory_name ?? undefined;
  const workspacePath = repo && directoryName ? path.join(WORKSPACES_ROOT, repo, directoryName) : undefined;
  const hasWorkspacePath = workspacePath ? existsSync(workspacePath) : false;
  const sessionStatus = row.session_status ?? undefined;
  const isCompacting = row.session_is_compacting === 1;
  const isWorking = Boolean(sessionStatus && sessionStatus !== "idle" && sessionStatus !== "error") || isCompacting;

  return {
    id: row.id,
    repo,
    repoPath: row.repo_path ?? undefined,
    directoryName,
    branch: row.branch ?? undefined,
    state: row.state ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    sessionStatus,
    sessionUpdatedAt: row.session_updated_at ? new Date(row.session_updated_at) : undefined,
    isWorking,
    workspacePath,
    hasWorkspacePath,
  };
}

type WorkspaceRow = {
  id: string;
  repo: string | null;
  repo_path: string | null;
  directory_name: string | null;
  branch: string | null;
  state: string | null;
  created_at: string | null;
  updated_at: string | null;
  session_status: string | null;
  session_is_compacting: number | null;
  session_updated_at: string | null;
};

type Workspace = {
  id: string;
  repo?: string;
  repoPath?: string;
  directoryName?: string;
  branch?: string;
  state?: string;
  createdAt?: Date;
  updatedAt?: Date;
  sessionStatus?: string;
  sessionUpdatedAt?: Date;
  isWorking: boolean;
  workspacePath?: string;
  hasWorkspacePath: boolean;
};

function getWorkspaceIcon(workspace: Workspace) {
  if (workspace.isWorking) {
    return { source: Icon.CircleProgress, tintColor: Color.Blue };
  }

  return workspace.hasWorkspacePath ? Icon.Folder : Icon.Warning;
}
