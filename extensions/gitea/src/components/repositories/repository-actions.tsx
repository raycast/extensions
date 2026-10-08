import { Action, ActionPanel, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import type { Repository } from "../../types/api";
import RepositoryCloneActions from "./repository-clone-actions";
import CreateIssue from "../../issue-create";
import SearchIssues from "../../issue-search";

export default function RepositoryActions(props: {
  item: Repository;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
  children?: ActionPanel.Section.Children;
}) {
  const { cloneProtocol = "https" } = getPreferenceValues<ExtensionPreferences>();
  const cloneUrl = getPreferredCloneUrl(props.item, cloneProtocol);

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

        {getCreateIssueAction(props.item)}
        {getSearchIssuesAction(props.item)}
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

function getCreateIssueAction(item: Repository) {
  return item.full_name && !item.archived && item.has_issues !== false ? (
    <Action.Push
      title="Create Issue"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateIssue initialRepo={item} />}
    />
  ) : null;
}

function getSearchIssuesAction(item: Repository) {
  return item.full_name && item.has_issues !== false ? (
    <Action.Push
      title="Search Issues"
      icon={Icon.MagnifyingGlass}
      target={<SearchIssues initialSearchText={`repo:${item.full_name}`} />}
    />
  ) : null;
}

function getPreferredCloneUrl(item: Repository, cloneProtocol: ExtensionPreferences["cloneProtocol"]) {
  if (cloneProtocol === "https") {
    return item.clone_url || item.ssh_url;
  }

  return item.ssh_url || item.clone_url;
}
