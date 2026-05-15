import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { Repository } from "../../types/api";
import CreateIssue from "../../issue-create";
import { useInstalledEditors, getEditorUrlScheme } from "../../hooks/useInstalledEditors";

function CloneActions({ cloneUrl }: { cloneUrl: string }) {
  const { installedEditors } = useInstalledEditors();

  if (installedEditors.length === 0) {
    return null;
  }

  const shortcut_keys = (i: number) => (i + 1).toString() as "1" | "2" | "3" | "4" | "5" | "6";

  return (
    <ActionPanel.Section title="Clone with Editor">
      {installedEditors.map((editor, index) => (
        <Action.OpenInBrowser
          key={editor.bundleId}
          title={`Clone with ${editor.name}`}
          icon={{ source: editor.icon }}
          url={getEditorUrlScheme(editor.id, cloneUrl)}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: shortcut_keys(index) },
            Windows: {
              modifiers: ["ctrl", "shift"],
              key: shortcut_keys(index),
            },
          }}
        />
      ))}
    </ActionPanel.Section>
  );
}

export default function RepositoryActions(props: {
  item: Repository;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
  children?: ActionPanel.Section.Children;
}) {
  const cloneUrl = props.item.ssh_url || props.item.clone_url;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {props.item.html_url ? (
          <Action.OpenInBrowser
            title="Open Repository"
            url={props.item.html_url}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        ) : null}

        <Action
          title={props.showDetails ? "Hide Details" : "Show Details"}
          icon={props.showDetails ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "d" },
            Windows: { modifiers: ["ctrl", "shift"], key: "d" },
          }}
          onAction={() => props.setShowDetails(!props.showDetails)}
        />

        {props.item.full_name ? (
          <Action.Push
            title="Create Issue"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CreateIssue initialRepo={props.item} />}
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        {props.item.html_url ? (
          <Action.CopyToClipboard
            title="Copy HTML URL"
            content={props.item.html_url}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "h" },
              Windows: { modifiers: ["ctrl", "shift"], key: "h" },
            }}
          />
        ) : null}
        {props.item.clone_url ? (
          <Action.CopyToClipboard
            title="Copy Clone URL"
            content={props.item.clone_url}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "c" },
              Windows: { modifiers: ["ctrl", "shift"], key: "c" },
            }}
          />
        ) : null}
        {props.item.ssh_url ? (
          <Action.CopyToClipboard
            title="Copy SSH URL"
            content={props.item.ssh_url}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "s" },
              Windows: { modifiers: ["ctrl", "shift"], key: "s" },
            }}
          />
        ) : null}
      </ActionPanel.Section>

      {cloneUrl ? <CloneActions cloneUrl={cloneUrl} /> : null}

      {props.children ? <ActionPanel.Section>{props.children}</ActionPanel.Section> : null}
    </ActionPanel>
  );
}
