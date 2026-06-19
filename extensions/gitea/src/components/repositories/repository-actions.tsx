import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { Repository } from "../../types/api";
import RepositoryCloneActions from "./repository-clone-actions";

export default function RepositoryActions(props: {
  item: Repository;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
  createIssueAction?: ActionPanel.Section.Children;
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

        {props.createIssueAction}
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

      {cloneUrl ? <RepositoryCloneActions cloneUrl={cloneUrl} /> : null}

      {props.children && <ActionPanel.Section>{props.children}</ActionPanel.Section>}
    </ActionPanel>
  );
}
