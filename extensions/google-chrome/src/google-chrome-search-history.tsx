import { List, ToastStyle, showToast, ActionPanel, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";
import { useState, ReactElement } from "react"
import { URL } from "url";
import { HistoryEntry, useChromeHistorySearch } from "./browserHistory"

export default function Command(): ReactElement {
    const [searchText, setSearchText] = useState<string>()
    const { isLoading, error, response } = useChromeHistorySearch(searchText)

    if (error) {
        showToast(ToastStyle.Failure, "An Error Occurred", error)
    }

    return (<List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
        {response?.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} />
        ))}
    </List>);
}

const getFavicon = (url: string): string => {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
}

const HistoryItem = (props: { entry: HistoryEntry }): ReactElement => {
    const { url, title } = props.entry
    const id = props.entry.id.toString()
    const favicon = getFavicon(url)

    return (
        <List.Item
            id={id}
            title={title}
            subtitle={url}
            icon={favicon}
            actions={<Actions entry={props.entry} />} />)
}

const Actions = (props: { entry: HistoryEntry }): ReactElement => {
    const { title, url } = props.entry

    return (
        <ActionPanel title={title}>
            <OpenInBrowserAction
                title="Open in Browser"
                url={url} />
            <CopyToClipboardAction
                title="Copy URL"
                content={url}
                shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
    )
}
