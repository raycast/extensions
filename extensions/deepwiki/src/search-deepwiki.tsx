import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api"
import { showFailureToast, useCachedPromise, useLocalStorage } from "@raycast/utils"
import fetch from "node-fetch"
import { useCallback, useState } from "react"

interface RepoResult {
  id: string // Using org/repo as ID
  orgRepo: string
  description: string
  stars: string
  deepWikiUrl: string
  githubUrl: string
}

interface ApiRepoResult {
  // id: string // We'll generate our ID from repo_name
  repo_name: string // Contains owner/repo
  description: string
  stargazers_count?: number | string
  // last_modified, language, topics are also available if needed later
}

const HISTORY_KEY = "history"

export default function Command() {
  const [searchText, setSearchText] = useState("")
  const {
    value: history = [],
    isLoading: isLoadingHistory,
    setValue: setHistory,
  } = useLocalStorage<RepoResult[]>(HISTORY_KEY, [])

  const { data: searchResults, isLoading: isLoadingSearch } = useCachedPromise(
    async (query: string) => {
      const searchUrl = `https://api.devin.ai/ada/list_public_indexes?search_repo=${encodeURIComponent(query)}`
      const response = await fetch(searchUrl, {
        headers: {
          accept: "*/*",
          "accept-language": "en,en-US;q=0.9",
        },
        method: "GET",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response Body:", errorText)
        throw new Error(`API error! status: ${response.status} ${response.statusText}`)
      }

      const responseBodyText = await response.text()
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(responseBodyText)
      } catch (parseError: unknown) {
        console.error("Failed to parse JSON response:", parseError)
        throw new Error("Failed to parse API response.")
      }

      if (
        !parsedJson ||
        typeof parsedJson !== "object" ||
        !Array.isArray((parsedJson as { indices?: unknown }).indices)
      ) {
        throw new Error("API response is not in the expected format (object with indices array).")
      }

      const apiResults = (parsedJson as { indices: ApiRepoResult[] }).indices

      const parsedResults: RepoResult[] = apiResults.map((item) => {
        const orgRepo = item.repo_name
        const [owner, repo] = orgRepo.split("/")
        const stars = item.stargazers_count != null ? String(item.stargazers_count) : ""
        return {
          id: orgRepo,
          orgRepo,
          description: item.description || "",
          stars,
          deepWikiUrl: owner && repo ? `https://deepwiki.com/${owner}/${repo}` : `https://deepwiki.com/${orgRepo}`,
          githubUrl: `https://github.com/${orgRepo}`,
        }
      })

      return parsedResults.filter((repo, index, self) => index === self.findIndex((r) => r.orgRepo === repo.orgRepo))
    },
    [searchText],
    {
      execute: searchText.length > 0,
      keepPreviousData: true,
      failureToastOptions: {
        title: "Search Failed",
      },
    },
  )

  const onOpen = useCallback(
    async (repo: RepoResult) => {
      const nextHistory = [repo, ...history.filter((item) => item.id !== repo.id)]
      await setHistory(nextHistory)
    },
    [history, setHistory],
  )

  return (
    <List
      isLoading={isLoadingHistory || isLoadingSearch}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search indexed repositories (e.g., react, vscode)"
      throttle
    >
      {searchText.length === 0 ? (
        <List.Section title="History">
          {history.map((repo) => (
            <RepoListItem key={repo.id} repo={repo} onOpen={onOpen} />
          ))}
        </List.Section>
      ) : (searchResults?.length ?? 0) === 0 && !isLoadingSearch ? (
        <List.EmptyView
          title="No Repositories Found"
          description={`Could not find any matching repositories on DeepWiki for "${searchText}".`}
        />
      ) : (
        <List.Section title="Search Results">
          {searchResults?.map((repo) => (
            <RepoListItem key={repo.id} repo={repo} onOpen={onOpen} />
          ))}
        </List.Section>
      )}
    </List>
  )
}

function getRepoIcon(orgRepo: string) {
  const [owner] = orgRepo.split("/")
  return owner ? `https://github.com/${owner}.png` : Icon.Code
}

function hasStars(stars: string) {
  return stars !== "" && stars !== "null"
}

function RepoListItem({ repo, onOpen }: { repo: RepoResult; onOpen: (repo: RepoResult) => void }) {
  return (
    <List.Item
      icon={getRepoIcon(repo.orgRepo)}
      title={repo.orgRepo}
      subtitle={repo.description || undefined}
      accessories={hasStars(repo.stars) ? [{ text: repo.stars, icon: Icon.Star }] : []}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in DeepWiki" url={repo.deepWikiUrl} onOpen={() => onOpen(repo)} />
          <Action.OpenInBrowser title="Open in GitHub" url={repo.githubUrl} />
          <Action
            title="Crawl and Copy Docs"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "crawl-deepwiki-docs",
                  type: LaunchType.UserInitiated,
                  arguments: { repoIdentifier: repo.orgRepo },
                })
              } catch (error) {
                showFailureToast(error, {
                  title: "Failed to start crawl command",
                })
              }
            }}
          />
          <Action
            title="Open DeepWiki Page Command"
            icon={Icon.Terminal}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "open-deepwiki",
                  type: LaunchType.UserInitiated,
                  arguments: { repoIdentifier: repo.orgRepo },
                })
              } catch (error) {
                showFailureToast(error, {
                  title: "Failed to launch command",
                })
              }
            }}
          />
          <Action.CopyToClipboard title="Copy DeepWiki URL" content={repo.deepWikiUrl} />
          <Action.CopyToClipboard title="Copy GitHub URL" content={repo.githubUrl} />
          <Action.CopyToClipboard title="Copy Org/repo" content={repo.orgRepo} />
        </ActionPanel>
      }
    />
  )
}
