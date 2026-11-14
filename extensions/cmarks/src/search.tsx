import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { APP_STORE_URL, GITHUB_URL, isCmarksInstalled, launchCmarks, openInCmarks } from "./app";
import {
  abbreviateHome,
  listMarkdownFiles,
  loadFilter,
  loadWorkspaces,
  MarkdownFile,
  MAX_FILES_PER_WORKSPACE,
  ScanResult,
  Workspace,
} from "./cmarks";

const EMPTY_SCAN: ScanResult = { files: [], truncated: new Set(), unreadableRoots: [], skippedFolders: 0 };

export default function Command() {
  const { data, isLoading } = usePromise(
    async () => {
      const installed = await isCmarksInstalled();
      if (!installed) return { installed, workspaces: [] as Workspace[], scan: EMPTY_SCAN };
      const [workspaces, filter] = await Promise.all([loadWorkspaces(), loadFilter()]);
      const scan = await listMarkdownFiles(workspaces, filter);
      return { installed, workspaces, scan };
    },
    [],
    {
      failureToastOptions: { title: "Couldn't read cmarks workspaces" },
      // 읽지 못한 폴더는 빈 폴더처럼 보이지 않게 알린다(렌더 중이 아니라 데이터가 올 때 한 번).
      onData: ({ scan }) => {
        if (scan.skippedFolders > 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Some folders couldn't be read",
            message: `${scan.skippedFolders} folder${scan.skippedFolders === 1 ? "" : "s"} skipped. Check Raycast's Files and Folders permission in System Settings.`,
          });
        }
      },
    },
  );

  const scan = data?.scan ?? EMPTY_SCAN;
  const byWorkspace = new Map<string, MarkdownFile[]>();
  for (const file of scan.files) {
    const list = byWorkspace.get(file.workspace.root) ?? [];
    list.push(file);
    byWorkspace.set(file.workspace.root, list);
  }
  const unreadable = new Set(scan.unreadableRoots.map((w) => w.root));

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
          <List.Section
            key={workspace.root}
            title={workspace.name}
            subtitle={
              abbreviateHome(workspace.root) +
              (scan.truncated.has(workspace.root)
                ? ` · first ${MAX_FILES_PER_WORKSPACE.toLocaleString()} files only`
                : "")
            }
          >
            {unreadable.has(workspace.root) ? (
              <UnreadableItem workspace={workspace} />
            ) : (
              (byWorkspace.get(workspace.root) ?? []).map((file) => <FileItem key={file.path} file={file} />)
            )}
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

/** 워크스페이스 폴더 자체를 읽지 못했을 때의 한 줄. 빈 폴더와 구분되게 보여 준다. */
function UnreadableItem({ workspace }: { workspace: Workspace }) {
  return (
    <List.Item
      title="Can't read this folder"
      subtitle="Missing, or Raycast lacks permission (System Settings ▸ Privacy & Security ▸ Files and Folders)"
      icon={{ source: Icon.Warning, tintColor: Color.Orange }}
      actions={
        <ActionPanel>
          <Action.ShowInFinder path={workspace.root} />
          <Action.Open
            title="Open Files and Folders Settings"
            target="x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders"
            icon={Icon.Gear}
          />
        </ActionPanel>
      }
    />
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
