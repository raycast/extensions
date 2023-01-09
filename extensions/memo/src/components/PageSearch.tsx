import { Action, ActionPanel, Detail, List } from "@raycast/api"
import { useEffect, useState } from "react"
import { Saver } from "../core/saver"
import { Page, PageType, pageTypeToDisplayString } from "../core/dm"
import { DEFAULT_NOTION_ICON } from "../config"
import { RaycastAdapter } from "../adapters/raycast/adapter"

export type PageSearchProps = {
    saver: Saver
    copiedText: string
    pageTitle: string
    raycastAdapter: RaycastAdapter
}

export function PageSearch(props: PageSearchProps) {
    const [searchText, setSearchText] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [pages, setPages] = useState<Page[]>([])
    const [recentPage, setRecentPage] = useState<Page | undefined>()
    const [err, setErr] = useState<Error>()

    async function handleSearchTextChange(text: string) {
        setIsSearching(true)
        const toast = await props.raycastAdapter.showLoading("searching")

        const pages = await props.saver.getPages(text)
        if (pages instanceof Error) {
            console.error(pages)
            setErr(pages)
            props.raycastAdapter.setToastError(toast, pages)
        } else {
            setPages(pages)
            props.raycastAdapter.setToastSuccess(toast, "")
        }

        setIsSearching(false)
    }

    async function handlePageSelected(p: Page) {
        setIsSaving(true)
        const toast = await props.raycastAdapter.showLoading("saving")

        const rs = await props.saver.save(p, props.copiedText, props.pageTitle)
        if (rs instanceof Error) {
            setErr(rs)
            props.raycastAdapter.setToastError(toast, rs)
        }

        setIsSaving(false)
        props.raycastAdapter.setToastSuccess(toast, "")

        const err = await props.raycastAdapter.persistLastSelectedPage(p)
        if (err instanceof Error) {
            console.error(`${err}:cannot persist selected page`)
        }

        await props.raycastAdapter.closeExtension()
        await props.raycastAdapter.showHUD(`Saved to '${p.title}' ✅`)
    }

    // will run at start and every time `text` changes
    useEffect(() => {
        handleSearchTextChange(searchText)
    }, [searchText])

    useEffect(() => {
        async function getRecentPage() {
            // hide when searching
            if (searchText) {
                setRecentPage(undefined)
                return
            }

            const page = await props.raycastAdapter.getPersistedLastSelectedPage()
            if (page instanceof Error) {
                setRecentPage(undefined)
            } else {
                setRecentPage(page)
            }
        }

        getRecentPage()
    }, [])

    if (err) {
        return <Detail markdown={`${err}`} />
    }

    return (
        <List
            searchText={searchText}
            onSearchTextChange={setSearchText}
            navigationTitle="Search Notion"
            searchBarPlaceholder="Search by page name"
            isLoading={isSearching || isSaving}
            throttle={true}
            isShowingDetail={true}
        >
            <List.EmptyView title={"Not found"} />

            {recentPage && !searchText && (
                <List.Section title="Recent">
                    {getListItem(recentPage, props.copiedText, props.saver, handlePageSelected)}
                </List.Section>
            )}

            <List.Section title="Search result">
                {pages.map((p) => {
                    return getListItem(p, props.copiedText, props.saver, handlePageSelected)
                })}
            </List.Section>
        </List>
    )
}

function getIconSafe(p: Page): string {
    return p.icon ? p.icon : DEFAULT_NOTION_ICON
}

function getListDetail(p: Page): JSX.Element {
    const markdown = `
# ${getIconSafe(p)}
# ${p.title}
\`${pageTypeToDisplayString(p.type)}\`

---

${
    p.type === PageType.NotionPage
        ? "Append the **copied text** to this page"
        : "Save the **copied text** as a new page in this database"
}
    `

    return <List.Item.Detail markdown={markdown} />
}

function getListItem(p: Page, copiedText: string, saver: Saver, handleItemSelected: (p: Page) => void): JSX.Element {
    const actionName = p.type === PageType.NotionPage ? "Append to Page" : "Save as New Page"

    return (
        <List.Item
            key={p.id}
            title={`${getIconSafe(p)} ${p.title}`}
            detail={getListDetail(p)}
            actions={
                <ActionPanel>
                    <Action title={actionName} onAction={() => handleItemSelected(p)} icon="notion_icon.png" />
                </ActionPanel>
            }
        />
    )
}
