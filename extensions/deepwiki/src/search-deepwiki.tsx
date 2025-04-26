import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { ActionPanel, Action, List, showToast, Toast, Icon, launchCommand, LaunchType } from "@raycast/api"
import fetch from "node-fetch"
import * as cheerio from "cheerio"

interface RepoResult {
  id: string // Using org/repo as ID
  orgRepo: string
  description: string
  stars: string
  deepWikiUrl: string
  githubUrl: string
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
      const searchUrl = `https://deepwiki.com/?q=${encodeURIComponent(query)}`
      const response = await fetch(searchUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      const parsedResults: RepoResult[] = []

      const resultSelector = "a.block.h-full.min-h-32"
      const foundElements = $(resultSelector)

      foundElements.each((_index: number, element: cheerio.Element) => {
        const linkElement = $(element)
        const relativePath = linkElement.attr("href") || ""
        const deepWikiUrl = `https://deepwiki.com${relativePath}`

        const org = linkElement.find("span.text-text-light.mr-1").text().trim()
        const repo = linkElement.find("span.ml-1.text-white").text().trim()
        const orgRepo = org && repo ? `${org}/${repo}` : ""

        const description = linkElement.find("p.text-secondary-gray").text().trim()

        const stars = linkElement
          .find("svg[viewBox='0 0 256 256']")
          .next("span.text-secondary-gray.text-xs")
          .text()
          .trim()

        if (orgRepo) {
          if (!parsedResults.some((r: RepoResult) => r.orgRepo === orgRepo))
            parsedResults.push({
              id: orgRepo,
              orgRepo: orgRepo,
              description: description || "No description available",
              stars: stars,
              deepWikiUrl: deepWikiUrl,
              githubUrl: `https://github.com/${orgRepo}`,
            })
        }
      })

      if (parsedResults.length === 0 && !isLoading && query && $(resultSelector).length === 0) {
        if ($("body").text().includes("Which repo would you like to understand?")) {
          // Noop
        } else {
          console.warn("[DeepWiki Search] No results found and page structure seems unexpected.")
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not parse results",
            message: "The DeepWiki page structure might have changed or an error occurred.",
          })
        }
      }

      setResults(parsedResults)
    } catch (error: unknown) {
      console.error("[DeepWiki Search] Search failed:", error)
      let message = "Could not fetch results from DeepWiki"
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
      setResults([]) // Clear results on error
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
                <Action.OpenInBrowser title="Open in Deepwiki" url={repo.deepWikiUrl} />
                <Action.OpenInBrowser title="Open in GitHub" url={repo.githubUrl} />
                <Action
                  title="Open Deepwiki Page Command"
                  icon={Icon.Terminal}
                  onAction={async () => {
                    try {
                      await launchCommand({
                        name: "open-deepwiki",
                        type: LaunchType.UserInitiated,
                        arguments: { repoIdentifier: repo.orgRepo },
                      })
                    } catch (error) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to launch command",
                      })
                    }
                  }}
                />
                <Action.CopyToClipboard title="Copy Deepwiki URL" content={repo.deepWikiUrl} />
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
