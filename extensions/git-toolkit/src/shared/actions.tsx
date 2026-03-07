import { Action, getPreferenceValues } from "@raycast/api";

import { openInApp } from "./ui";

export function EditorActions({ repoPath }: { repoPath: string }) {
  const { editorApp, editorAppAlt } = getPreferenceValues<Preferences>();
  return (
    <>
      {editorApp && (
        <Action
          title={`Open in ${editorApp.name}`}
          icon={{ fileIcon: editorApp.path }}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => openInApp(editorApp.path, repoPath)}
        />
      )}
      {editorAppAlt && (
        <Action
          title={`Open in ${editorAppAlt.name}`}
          icon={{ fileIcon: editorAppAlt.path }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => openInApp(editorAppAlt.path, repoPath)}
        />
      )}
    </>
  );
}

export function OpenInTerminal({ repoPath }: { repoPath: string }) {
  const { terminalApp } = getPreferenceValues<Preferences>();
  const app = terminalApp || { name: "Terminal", path: "/System/Applications/Utilities/Terminal.app" };
  return (
    <Action
      title={`Open in ${app.name}`}
      icon={{ fileIcon: app.path }}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      onAction={() => openInApp(app.path, repoPath)}
    />
  );
}

export function CopyBranchName({ branch }: { branch: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Branch Name"
      content={branch}
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
    />
  );
}
