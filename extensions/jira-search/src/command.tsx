import { ActionPanel, List, showToast, Action, Toast } from "@raycast/api"
import { useEffect, useState } from "react"
import { ErrorText } from "./exception"

export type ResultItem = List.Item.Props & {
  id: string
  url: string
  linkText?: string
}
type SearchFunction<FilterType extends string> = (query: string, filter?: FilterType) => Promise<ResultItem[]>

const markdownLink = (item: ResultItem) => `[${item.linkText ?? item.title}](${item.url})`
const htmlLink = (item: ResultItem) => `<a href="${item.url}">${item.linkText ?? item.title}</a>`

export function SearchCommand<FilterType extends string>(
  search: SearchFunction<FilterType>,
  searchBarPlaceholder?: string,
  filter?: { tooltip: string; persist?: boolean; values: { name: string; value: FilterType }[] },
  getPreliminaryResult?: (query: string) => ResultItem | undefined,
) {
  const [query, setQuery] = useState("")
  const [currentFilter, setCurrentFilter] = useState(filter ? (filter.values[0]?.value ?? undefined) : undefined)
  const [items, setItems] = useState<ResultItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ErrorText>()
  useEffect(() => {
    console.debug("currentFilter", currentFilter)
    setError(undefined)
    setIsLoading(true)
    search(query, currentFilter)
      .then((resultItems) => {
        setItems(resultItems)
        setIsLoading(false)
      })
      .catch((e) => {
        if (e.name === "AbortError") {
          console.log("Request has been aborted")
        } else {
          setItems([])
          console.warn(e)
          if (e instanceof Error) {
            setError(ErrorText(e.name, e.message))
          }
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [query, currentFilter])

  const onSearchChange = (newSearch: string) => {
    const preResult = getPreliminaryResult && getPreliminaryResult(newSearch)
    if (preResult) {
      setItems([preResult])
    }
    setQuery(newSearch)
  }
  const buildItem = (item: ResultItem) => (
    <List.Item
      key={item.id}
      {...item}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="URL">
            <Action.OpenInBrowser url={item.url} />
            <Action.CopyToClipboard content={item.url} title="Copy URL" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Link">
            <Action.CopyToClipboard content={markdownLink(item)} title="Copy Markdown Link" />
            <Action.CopyToClipboard content={htmlLink(item)} title="Copy HTML Link" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: error.name,
      message: error.message,
    })
  }

  const onFilterChange = (f: string) => {
    setCurrentFilter(f as unknown as NonNullable<FilterType>)
  }

  let searchBarAccessory
  if (filter) {
    searchBarAccessory = (
      <List.Dropdown storeValue={!!filter.persist} tooltip={filter.tooltip} filtering onChange={onFilterChange}>
        {filter.values.map((f) => (
          <List.Dropdown.Item key={f.value} title={f.name} value={f.value} />
        ))}
      </List.Dropdown>
    )
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder={searchBarPlaceholder}
      throttle
      searchBarAccessory={searchBarAccessory}
    >
      {items.map(buildItem)}
    </List>
  )
}
