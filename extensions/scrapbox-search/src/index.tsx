import { useEffect, useState } from 'react'
import { Action, ActionPanel, getPreferenceValues, List, Icon } from '@raycast/api'
import { useCachedState } from '@raycast/utils'

import { useAPIs, validateResponse } from './api'
import { Page, SearchResult, Preferences } from './types'

let timer: ReturnType<typeof setTimeout>
let reqController: AbortController

function Command() {
  const { projectName, token, defaultPage } = getPreferenceValues<Preferences>()

  const [pages, setPages] = useState<Page[] | null>([])
  const [query, setQuery] = useState<string>('')
  const [cachedPages, setCachedPages] = useCachedState<Page[] | null>('cachedPages')
  const [filteredPages, setFilteredPages] = useState<Page[] | null>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const api = useAPIs(projectName, token)

  const searchByQuery = async (query: string) => {
    if (!query) {
      timer && clearTimeout(timer)
      reqController && reqController.abort()
      setPages([])
      return
    }

    if (timer) clearTimeout(timer)
    if (reqController) reqController.abort()

    timer = setTimeout(async () => {
      setIsLoading(true)
      const [req, ctl] = api.searchByQuery(query)
      reqController = ctl

      try {
        const res = await req
        validateResponse(res)
        const json = (await res.json()) as SearchResult
        json?.pages && setPages(json.pages)
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') console.log('request aborted')
      }

      setIsLoading(false)
    }, 100)
  }

  const filterCachedPages = (query: string) => {
    if (!query) {
      setFilteredPages([])
      return
    }

    const tokens = query.toLowerCase().split(' ')

    const filtered = cachedPages?.filter((page: Page) => {
      const title = page.title.toLowerCase()
      return tokens.every((token) => title.includes(token))
    })

    setFilteredPages(filtered || [])
  }

  const fetchRecentlyAccessedPages = async () => {
    const res = await api.fetchRecentlyAccessedPages()
    validateResponse(res)
    const json = (await res.json()) as SearchResult
    json?.pages && setCachedPages(json.pages)
  }

  useEffect(() => {
    fetchRecentlyAccessedPages()
  }, [])

  useEffect(() => {
    filterCachedPages(query)
    searchByQuery(query)
  }, [query])

  return (
    <List isLoading={isLoading} onSearchTextChange={(q) => setQuery(q)}>
      {/* show default page when keywords typed */}
      {!query && (
        <List.Section title="Open default page">
          <List.Item
            key={'top'}
            icon={Icon.House}
            title={projectName + (defaultPage ? `/${defaultPage}` : '')}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={encodeURI(`https://scrapbox.io/${projectName}/${defaultPage || ''}`)}
                ></Action.OpenInBrowser>
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* create new page when there's no matching page */}
      {query && pages?.length === 0 && (
        <List.Section title="Create new page">
          <List.Item
            key={query}
            icon={Icon.Pencil}
            title={query}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={encodeURI(`https://scrapbox.io/${projectName}/${query}`)}
                ></Action.OpenInBrowser>
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* search result */}
      <List.Section title="Search">
        {pages?.map((page: Page) => (
          <List.Item
            key={page.id}
            icon={Icon.MagnifyingGlass}
            title={page.title}
            subtitle={page.lines?.[0] || ''}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={encodeURI(`https://scrapbox.io/${projectName}/${page.title}`)}
                ></Action.OpenInBrowser>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {/* recently accessed pages */}
      <List.Section title="Recent Titles">
        {((filteredPages?.length && filteredPages) || cachedPages || []).map((page: Page) => (
          <List.Item
            key={page.id}
            icon={Icon.Clock}
            title={page.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={encodeURI(`https://scrapbox.io/${projectName}/${page.title}`)}
                ></Action.OpenInBrowser>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}

export default Command
