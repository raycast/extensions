import { Action, ActionPanel, Icon, Keyboard, List, open, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { abbreviateHome, BUNDLE_ID, listMarkdownFiles, loadFilter, loadWorkspaces, MarkdownFile } from "./cmarks";

export default function Command() {
  const { data, isLoading, error } = usePromise(async () => {
    const [workspaces, filter] = await Promise.all([loadWorkspaces(), loadFilter()]);
    const files = await listMarkdownFiles(workspaces, filter);
    return { workspaces, files };
  });

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Couldn't read cmarks workspaces", message: String(error) });
  }

  const byWorkspace = new Map<string, MarkdownFile[]>();
  for (const file of data?.files ?? []) {
    const list = byWorkspace.get(file.workspace.root) ?? [];
    list.push(file);
    byWorkspace.set(file.workspace.root, list);
  }

  const noWorkspaces = !isLoading && (data?.workspaces.length ?? 0) === 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Markdown files in cmarks workspaces…">
      {noWorkspaces ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No cmarks workspaces yet"
          description="Open a folder in cmarks (File ▸ New Workspace) and it will show up here."
          actions={
            <ActionPanel>
              <Action title="Open Cmarks" icon={Icon.AppWindow} onAction={() => open("cmarks://open", BUNDLE_ID)} />
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
      <Action title="Open in Cmarks" icon={Icon.AppWindow} onAction={() => open(path, BUNDLE_ID)} />
      <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
      <Action.ShowInFinder path={path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
      <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.OpenWith path={path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
    </ActionPanel>
  );
}
