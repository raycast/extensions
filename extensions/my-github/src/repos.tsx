import { Action, ActionPanel, List, popToRoot } from "@raycast/api"
import { useRepos, useUsageBasedSort } from "./hooks/hooks"
import { Repo } from "./types/types"

export default function Repos() {
  const { data, isLoading } = useRepos()
  const { data: sortedRepos, use } = useUsageBasedSort<Repo>(
    data || [],
    "repos"
  )

  return (
    <List isLoading={isLoading}>
      {sortedRepos.map((repo: Repo) => {
        return (
          <List.Item
            key={repo.id}
            title={repo.full_name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  onOpen={() => {
                    use(repo.id)
                    popToRoot()
                  }}
                  title="Open in GitHub.com"
                  url={repo.html_url}
                />
              </ActionPanel>
            }
          />
        )
      })}
      <List.EmptyView title="No repositories found" />
    </List>
  )
}
