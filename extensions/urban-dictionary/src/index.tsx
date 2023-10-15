import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Cache,
} from '@raycast/api'
import { useState, useEffect, useRef, useCallback } from 'react'
import fetch, { AbortError } from 'node-fetch'
import { URLSearchParams } from 'url'

const cache = new Cache()

type Arguments = {
  query: string
}

export default function Command(props: { arguments: Arguments }) {
  const { state, search } = useSearch(
    'autocomplete-extra',
    props.arguments.query ?? ''
  )

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Urban Dictionary..."
      throttle
      searchText={props.arguments.query}
    >
      <List.Section title="Suggestions" subtitle={state.results.length + ''}>
        {state.results.map((searchResult) => (
          <SearchListItem
            key={searchResult.preview}
            searchResult={searchResult}
          />
        ))}
      </List.Section>
    </List>
  )
}

function SearchListItem({
  searchResult,
}: {
  searchResult: UrbanAutocompleteResponseItem
}) {
  return (
    <List.Item
      title={searchResult.term}
      subtitle={searchResult.preview}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="See results"
              icon={Icon.Sidebar}
              target={<ItemDetails term={searchResult.term} />}
            />
            <Action.OpenInBrowser
              title="Open in Browser"
              url={`https://www.urbandictionary.com/define.php?term=${searchResult.term}`}
            />
            <Action.CopyToClipboard
              title={`Copy "${searchResult.term}" to clipboard`}
              content={searchResult.term}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}

function ItemDetails({ term }: { term: string }) {
  const { state } = useSearch('define', term)
  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder={`Definitions for "${term}"`}
      isShowingDetail
      enableFiltering
      navigationTitle="Show Definitions"
    >
      <List.Section title="Results" subtitle={state.results.length + ''}>
        {state.results.map((result) => (
          <List.Item
            key={result.defid}
            title={result.definition}
            detail={
              <List.Item.Detail
                markdown={getMarkdown(result)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Thumbs up"
                      text={result.thumbs_up.toString()}
                      icon={Icon.Heart}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Thumbs down"
                      text={result.thumbs_down.toString()}
                      icon={Icon.HeartDisabled}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Author"
                      text={result.author}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Date"
                      text={new Date(result.written_on).toLocaleDateString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={`https://www.urbandictionary.com/define.php?term=${term}`}
                  />
                  <Action.CopyToClipboard
                    title={`Copy "${term}" to clipboard`}
                    content={term}
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}

function makeLinks(string: string) {
  return string.replace(
    /\[(.*?)\]/gm,
    (match, term) =>
      `[${term}](https://www.urbandictionary.com/define.php?term=${term.replace(
        /\s/g,
        '+'
      )})`
  )
}

function getMarkdown(result: UrbanDefineResponseItem) {
  return `
${makeLinks(result.definition)}
> ${makeLinks(result.example.replace(/\r?\n/gm, '\n> '))}
`
}

type Endpoint = 'define' | 'autocomplete-extra'

function useSearch<T extends Endpoint>(endpoint: T, initial = '') {
  const [state, setState] = useState<SearchState<T>>({
    results: [],
    isLoading: true,
  })
  const cancelRef = useRef<AbortController | null>(null)

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort()

      const cacheKey = `${endpoint}.${searchText}`
      if (cache.has(cacheKey)) {
        setState({
          results: JSON.parse(cache.get(cacheKey)!),
          isLoading: false,
        })
        return
      }

      cancelRef.current = new AbortController()
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }))
      try {
        const results = await performSearch(
          endpoint,
          searchText,
          cancelRef.current.signal
        )
        setState({
          results: results,
          isLoading: false,
        })
        cache.set(cacheKey, JSON.stringify(results))
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }))

        if (error instanceof AbortError) {
          return
        }

        console.error('search error', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Could not perform search',
          message: String(error),
        })
      }
    },
    [cancelRef, setState, endpoint]
  )

  useEffect(() => {
    search(initial)
    return () => {
      cancelRef.current?.abort()
    }
  }, [initial])

  return {
    state: state,
    search: search,
  }
}

type UrbanAutocompleteResponseItem = {
  preview: string
  term: string
}

type UrbanDefineResponseItem = {
  definition: string
  permalink: string
  thumbs_up: number
  author: string
  word: string
  defid: number
  current_vote: string
  written_on: string
  example: string
  thumbs_down: number
}

type UrbanResponseItem<T extends Endpoint> = T extends 'define'
  ? UrbanDefineResponseItem
  : UrbanAutocompleteResponseItem

type UrbanResponseList<T extends Endpoint> = T extends 'define'
  ? { list: UrbanDefineResponseItem[] }
  : { results: UrbanAutocompleteResponseItem[] }

async function performSearch<T extends Endpoint>(
  endpoint: T,
  searchText: string,
  signal: AbortSignal
): Promise<UrbanResponseItem<T>[]> {
  const params = new URLSearchParams()
  params.append('term', searchText)

  const response = await fetch(
    `https://api.urbandictionary.com/v0/${endpoint}?${params.toString()}`,
    {
      method: 'get',
      // @ts-expect-error -- not me
      signal: signal,
    }
  )

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  const json = (await response.json()) as UrbanResponseList<typeof endpoint>

  if ('list' in json) {
    return json.list as UrbanResponseItem<typeof endpoint>[]
  }

  return json.results as UrbanResponseItem<typeof endpoint>[]
}

interface SearchState<T extends Endpoint> {
  results: UrbanResponseItem<T>[]
  isLoading: boolean
}
