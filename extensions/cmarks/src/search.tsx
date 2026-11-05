import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { APP_STORE_URL, GITHUB_URL, isCmarksInstalled, launchCmarks, openInCmarks } from "./app";
import { abbreviateHome, listMarkdownFiles, loadFilter, loadWorkspaces, MarkdownFile } from "./cmarks";

export default function Command() {
  const { data, isLoading } = usePromise(
    async () => {
      const installed = await isCmarksInstalled();
      if (!installed) return { installed, workspaces: [], files: [] };
      const [workspaces, filter] = await Promise.all([loadWorkspaces(), loadFilter()]);
      const files = await listMarkdownFiles(workspaces, filter);
      return { installed, workspaces, files };
    },
    [],
    { failureToastOptions: { title: "Couldn't read cmarks workspaces" } },
  );

  const byWorkspace = new Map<string, MarkdownFile[]>();
  for (const file of data?.files ?? []) {
    const list = byWorkspace.get(file.workspace.root) ?? [];
    list.push(file);
    byWorkspace.set(file.workspace.root, list);
  }

  const notInstalled = data !== undefined && !data.installed;
  const noWorkspaces = !isLoading && !notInstalled && (data?.workspaces.length ?? 0) === 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Markdown files in cmarks workspaces…">
      {notInstalled ? (
        <NotInstalledView />
      ) : noWorkspaces ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No cmarks workspaces yet"
          description="Open a folder in cmarks (File ▸ New Workspace) and it will show up here."
          actions={
            <ActionPanel>
              <Action title="Open Cmarks" icon={Icon.AppWindow} onAction={launchCmarks} />
            </ActionPanel>
          }
        />
      ) : (
        (data?.workspaces ?? []).map((workspace) => (
          <List.Section key={workspace.root} title={workspace.name} subtitle={abbreviateHome(workspace.root)}>
            {(byWorkspace.get(workspace.root) ?? []).map((file) => (
              <FileItem key={file.path} file={file} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function FileItem({ file }: { file: MarkdownFile }) {
  return (
    <List.Item
      title={file.name}
      subtitle={file.relativeDir || undefined}
      icon={Icon.Document}
      keywords={file.relativeDir ? file.relativeDir.split("/") : undefined}
      quickLook={{ path: file.path, name: file.name }}
      actions={<FileActions path={file.path} />}
    />
  );
}

export function FileActions({ path }: { path: string }) {
  return (
    <ActionPanel>
      <Action title="Open in Cmarks" icon={Icon.AppWindow} onAction={() => openInCmarks(path)} />
      <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
      <Action.ShowInFinder path={path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
      <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.OpenWith path={path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
    </ActionPanel>
  );
}

/** cmarks가 설치돼 있지 않을 때의 빈 화면. 받을 수 있는 곳으로 안내한다. */
export function NotInstalledView() {
  return (
    <List.EmptyView
      icon={Icon.Download}
      title="cmarks is not installed"
      description="Install cmarks from the Mac App Store or GitHub, then run this command again."
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Get It on the Mac App Store" url={APP_STORE_URL} icon={Icon.AppWindow} />
          <Action.OpenInBrowser title="Get It on GitHub" url={GITHUB_URL} icon={Icon.Code} />
        </ActionPanel>
      }
    />
  );
}
