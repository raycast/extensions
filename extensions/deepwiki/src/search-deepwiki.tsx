import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, showToast, Toast } from "@raycast/api"
import { showFailureToast } from "@raycast/utils"
import fetch from "node-fetch"
import * as React from "react"
import { useCallback, useEffect, useState } from "react"

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

export default function Command(): React.ReactElement {
  const [searchText, setSearchText] = useState("")
  const [results, setResults] = useState<RepoResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const performSearch = useCallback(async (query: string) => {
    if (!query) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const searchUrl = `https://api.devin.ai/ada/list_public_indexes?search_repo=${encodeURIComponent(query)}`
      const response = await fetch(searchUrl, {
        headers: {
          accept: "*/*",
          "accept-language": "en,en-US;q=0.9",
        },
        method: "GET",
      })

      if (!response.ok) {
        // Log the raw response text on error for debugging
        const errorText = await response.text()
        console.error("API Error Response Body:", errorText)
        throw new Error(`API error! status: ${response.status} ${response.statusText}`)
      }

      // Log raw response body before parsing
      const responseBodyText = await response.text()
      console.log("Raw API Response Body:", responseBodyText)

      // Parse the JSON response with error handling
      let apiResults: ApiRepoResult[] = []
      try {
        const parsedJson = JSON.parse(responseBodyText)
        // console.log("Parsed JSON:", parsedJson) // Remove log

        // Access the indices array
        if (parsedJson && Array.isArray(parsedJson.indices)) {
          apiResults = parsedJson.indices as ApiRepoResult[]
        } else {
          console.error("Parsed JSON does not contain an 'indices' array:", parsedJson)
          throw new Error("API response is not in the expected format (object with indices array).")
        }
      } catch (parseError: unknown) {
        console.error("Failed to parse JSON response:", parseError)
        // console.error("Raw response text was:", responseBodyText) // Remove log
        throw new Error("Failed to parse API response.")
      }

      // Map API results to our RepoResult interface
      const parsedResults: RepoResult[] = apiResults.map((item) => {
        const orgRepo = item.repo_name // Directly use repo_name
        // Extract owner and repo for the DeepWiki URL (assuming owner/repo format)
        const [owner, repo] = orgRepo.split("/")
        const stars = item.stargazers_count !== undefined ? String(item.stargazers_count) : ""
        return {
          id: orgRepo, // Use orgRepo as ID
          orgRepo: orgRepo,
          description: item.description || "No description available",
          stars: stars,
          // Construct DeepWiki URL using extracted owner/repo
          deepWikiUrl: owner && repo ? `https://deepwiki.com/${owner}/${repo}` : `https://deepwiki.com/${orgRepo}`, // Fallback just in case
          githubUrl: `https://github.com/${orgRepo}`,
        }
      })

      const uniqueResults = parsedResults.filter(
        (repo, index, self) => index === self.findIndex((r) => r.orgRepo === repo.orgRepo),
      )

      setResults(uniqueResults)
    } catch (error: unknown) {
      let message = "Could not fetch results from API"
      if (error instanceof Error) {
        message = error.message
      } else if (typeof error === "string") {
        message = error
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Search Failed",
        message: message,
      })
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    performSearch(searchText)
  }, [searchText, performSearch])

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search indexed repositories (e.g., react, vscode)"
      throttle
    >
      {results.length === 0 && !isLoading && searchText ? (
        <List.EmptyView
          title="No Repositories Found"
          description={`Could not find any matching repositories on DeepWiki for "${searchText}".`}
        />
      ) : (
        results.map((repo: RepoResult) => (
          <List.Item
            key={repo.id}
            title={repo.orgRepo}
            subtitle={repo.description}
            accessories={repo.stars ? [{ text: repo.stars, icon: Icon.Star }] : []}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in DeepWiki" url={repo.deepWikiUrl} />
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
        ))
      )}
    </List>
  )
}
