import { NavigationContext, RepositoryContext } from "../../open-repository";
import { GitView } from "../../types";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { RepositoryDirectoryActions } from "./RepositoryDirectoryActions";

export function WorkspaceNavigationDropdown(context: NavigationContext) {
  return (
    <List.Dropdown
      tooltip="Select View"
      value={context.currentView}
      onChange={(newValue: string) => context.navigateTo(newValue as GitView)}
    >
      <List.Dropdown.Item
        title="Status"
        value="status"
        keywords={["diff", "changes", "state", "workspace", "patch"]}
        icon={Icon.NewDocument}
      />
      <List.Dropdown.Item title="Commits" value="commits" keywords={["log", "history"]} icon={`git-commit.svg`} />
      <List.Dropdown.Item title="Branches" value="branches" keywords={["graph", "remote"]} icon={`git-branch.svg`} />
      <List.Dropdown.Item title="Tags" value="tags" icon={Icon.Tag} />
      <List.Dropdown.Item title="Remotes" value="remotes" keywords={["origin"]} icon={Icon.Network} />
      <List.Dropdown.Item title="Stashes" value="stashes" keywords={["bookmark"]} icon={Icon.Bookmark} />
      <List.Dropdown.Item
        title="Files"
        value="files"
        keywords={["history", "ls-files", "workspace", "project"]}
        icon={Icon.Folder}
      />
    </List.Dropdown>
  );
}

export function WorkspaceNavigationActions(context: NavigationContext & RepositoryContext) {
  return (
    <>
      <ActionPanel.Section title="Navigation">
        <Action
          title="Go to Status"
          onAction={() => context.navigateTo("status")}
          icon={Icon.NewDocument}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
        />
        <Action
          title="Go to Commits"
          onAction={() => context.navigateTo("commits")}
          icon={`git-commit.svg`}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
        />
        <Action
          title="Go to Branches"
          onAction={() => context.navigateTo("branches")}
          icon={`git-branch.svg`}
          shortcut={{ modifiers: ["cmd"], key: "3" }}
        />
        <Action
          title="Go to Tags"
          onAction={() => context.navigateTo("tags")}
          icon={Icon.Tag}
          shortcut={{ modifiers: ["cmd"], key: "4" }}
        />
        <Action
          title="Go to Remotes"
          onAction={() => context.navigateTo("remotes")}
          icon={Icon.Network}
          shortcut={{ modifiers: ["cmd"], key: "5" }}
        />
        <Action
          title="Go to Stash"
          onAction={() => context.navigateTo("stashes")}
          icon={Icon.Bookmark}
          shortcut={{ modifiers: ["cmd"], key: "6" }}
        />
        <Action
          title="Go to Files"
          onAction={() => context.navigateTo("files")}
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd"], key: "0" }}
        />
      </ActionPanel.Section>

      <RepositoryDirectoryActions repositoryPath={context.gitManager.repoPath} />
    </>
  );
}
