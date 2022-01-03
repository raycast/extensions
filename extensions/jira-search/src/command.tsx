import {
    ActionPanel,
    CopyToClipboardAction,
    List,
    ListItemProps,
    OpenInBrowserAction,
    showToast,
    ToastStyle
} from "@raycast/api"
import {useEffect, useState} from "react"

export type ResultItem = ListItemProps & { url: string }
type SearchFunction = (query: string) => Promise<ResultItem[]>

export function SearchCommand(search: SearchFunction, searchBarPlaceholder?: string) {
    const [query, setQuery] = useState("")
    const [items, setItems] = useState<ResultItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string>()
    useEffect(() => {
        setError(undefined)
        setIsLoading(true)
        search(query).then(resultItems => {
            setItems(resultItems)
            setIsLoading(false)
        })
        .catch(e => {
            setItems([])
            if (e instanceof Error) {
                setError(e.message)
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
                        <OpenInBrowserAction url={item.url}/>
                        <CopyToClipboardAction content={item.url} title="Copy URL"/>
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Link">
                        <CopyToClipboardAction content={`[${item.title}](${item.url})`} title="Copy Markdown Link"/>
                        <CopyToClipboardAction content={`<a href="${item.url}">${item.title}</a>`} title="Copy HTML Link"/>
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    )

    if (error) {
        showToast(ToastStyle.Failure, "An error occured", error)
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
    );
}
