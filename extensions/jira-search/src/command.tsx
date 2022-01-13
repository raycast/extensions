import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  ListItemProps,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api"
import { useEffect, useState } from "react"
import { ErrorText } from "./exception"

export type ResultItem = ListItemProps & {
  url: string
  linkText?: string
}
type SearchFunction = (query: string) => Promise<ResultItem[]>

const markdownLink = (item: ResultItem) => `[${item.linkText ?? item.title}](${item.url})`
const htmlLink = (item: ResultItem) => `<a href="${item.url}">${item.linkText ?? item.title}</a>`

export function SearchCommand(search: SearchFunction, searchBarPlaceholder?: string) {
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<ResultItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ErrorText>()
  useEffect(() => {
    setError(undefined)
    setIsLoading(true)
    search(query)
      .then((resultItems) => {
        setItems(resultItems)
        setIsLoading(false)
      })
      .catch((e) => {
        setItems([])
        console.warn(e)
        if (e instanceof Error) {
          setError(ErrorText(e.name, e.message))
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [query])

  const onSearchChange = (newSearch: string) => setQuery(newSearch)
  const buildItem = (item: ResultItem) => (
    <List.Item
      key={item.id}
      {...item}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="URL">
            <OpenInBrowserAction url={item.url} />
            <CopyToClipboardAction content={item.url} title="Copy URL" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Link">
            <CopyToClipboardAction content={markdownLink(item)} title="Copy Markdown Link" />
            <CopyToClipboardAction content={htmlLink(item)} title="Copy HTML Link" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )

  if (error) {
    showToast(ToastStyle.Failure, error.name, error.message)
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder={searchBarPlaceholder}
      throttle
    >
      {items.map(buildItem)}
    </List>
  )
}
