import { Action, ActionPanel, Color, Icon, Keyboard, launchCommand, LaunchType, List } from "@raycast/api";
import { CopyIdAction } from "./components/CopyActions";
import { useSources } from "./jules";
import { formatRepoName } from "./utils";

export default function Command() {
  const { data, isLoading, revalidate } = useSources();

  return (
    <List isLoading={isLoading}>
      <List.EmptyView title="No Sources Found" icon={Icon.MagnifyingGlass} />
      {data?.map((source) => {
        const repo = source.githubRepo;
        if (!repo) return null;

        const repoName = formatRepoName(source.name);
        const branchCount = repo.branches?.length ?? 0;

        return (
          <List.Item
            key={source.id}
            title={repoName}
            icon={{
              source: Icon.Box,
              tintColor: repo.isPrivate ? Color.Purple : Color.Green,
            }}
            accessories={[
              {
                text: `${branchCount} ${branchCount === 1 ? "branch" : "branches"}`,
                icon: { source: "git-branch.svg", tintColor: Color.SecondaryText },
              },
              {
                icon: repo.isPrivate ? Icon.Lock : Icon.Globe,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in GitHub"
                  url={`https://github.com/${repo.owner}/${repo.repo}`}
                  icon={Icon.Link}
                />
                <Action
                  title="Launch Session with Source"
                  icon={Icon.PlusCircle}
                  onAction={() =>
                    launchCommand({
                      name: "launch-session",
                      type: LaunchType.UserInitiated,
                      context: { source: source.name },
                    })
                  }
                />
                <CopyIdAction id={source.name} title="Copy Source Name" />
                <Action
                  title="Refresh Sources"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
