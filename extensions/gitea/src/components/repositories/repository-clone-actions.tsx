import { Action, ActionPanel } from "@raycast/api";
import { getEditorUrlScheme } from "../../domain/editor";
import { useInstalledEditors } from "../../hooks/useInstalledEditors";

const cloneShortcutKeys = ["1", "2", "3", "4", "5", "6"] as const;

export default function RepositoryCloneActions({ cloneUrl }: { cloneUrl: string }) {
  const { installedEditors } = useInstalledEditors();

  if (installedEditors.length === 0) {
    return null;
  }

  return (
    <ActionPanel.Section title="Clone with Editor">
      {installedEditors.map((editor, index) => (
        <Action.OpenInBrowser
          key={editor.bundleId}
          title={`Clone with ${editor.name}`}
          icon={{ source: editor.icon }}
          url={getEditorUrlScheme(editor.id, cloneUrl)}
          shortcut={
            cloneShortcutKeys[index]
              ? {
                  macOS: { modifiers: ["cmd", "shift"], key: cloneShortcutKeys[index] },
                  Windows: { modifiers: ["ctrl", "shift"], key: cloneShortcutKeys[index] },
                }
              : undefined
          }
        />
      ))}
    </ActionPanel.Section>
  );
}
