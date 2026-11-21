import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import type { Collection, PasteSummary } from "@sniptide/sdk"
import { useState } from "react"
import { client } from "../api"
import { primaryAction } from "../deliver"
import { languageLabel, visibilityLabel } from "../lib/format"
import { messages } from "../lib/messages"
import { report } from "../report"
import { FailureView } from "./failure-view"
import { CodeActions, LinkActions } from "./paste-actions"
import { PasteDetail } from "./paste-detail"

const PAGE_SIZE = 25

const VISIBILITY_ICON = { private: Icon.Lock, unlisted: Icon.Link, public: Icon.Globe } as const

// The reader's pastes, searched on Sniptide as they type. Inside a collection the list stays in
// it, and at the top level a dropdown narrows the search to one.
export function PasteList({ collection }: { collection?: Collection }) {
  const [searchText, setSearchText] = useState("")
  const [filter, setFilter] = useState("")
  const first = primaryAction()
  const slug = collection?.slug ?? filter
  const query = searchText.trim()

  const { data: collections } = useCachedPromise(
    async () => (await client().listCollections()).collections,
    [],
    // The paste search reports a failure. The dropdown stays out of the way without its list.
    { execute: !collection, onError: () => {} },
  )

  const { data, isLoading, pagination, error } = useCachedPromise(
    (q: string, inCollection: string) =>
      async ({ cursor }: { cursor?: string }) => {
        const page = await client().listPastes({
          limit: PAGE_SIZE,
          ...(q ? { q } : {}),
          ...(inCollection ? { collection: inCollection } : {}),
          ...(cursor ? { cursor } : {}),
        })
        return {
          data: page.pastes,
          hasMore: page.nextCursor !== null,
          cursor: page.nextCursor ?? undefined,
        }
      },
    [query, slug],
    { keepPreviousData: true, onError: (failure) => report(failure, messages.failed) },
  )

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      throttle
      onSearchTextChange={setSearchText}
      navigationTitle={collection?.name}
      searchBarPlaceholder={
        collection ? messages.searchPastesIn(collection.name) : messages.searchPastes
      }
      searchBarAccessory={
        collection || !collections?.length ? undefined : (
          <List.Dropdown tooltip={messages.collectionFilter} value={filter} onChange={setFilter}>
            <List.Dropdown.Item title={messages.allPastes} value="" />
            <List.Dropdown.Section title={messages.collections}>
              {collections.map((item) => (
                <List.Dropdown.Item key={item.slug} title={item.name} value={item.slug} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
    >
      {error && !data?.length ? (
        <FailureView error={error} />
      ) : query ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={messages.noMatchesTitle} />
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title={messages.noPastesTitle}
          description={messages.noPastesBody}
        />
      )}
      {data?.map((paste) => (
        <PasteItem key={paste.id} paste={paste} first={first} />
      ))}
    </List>
  )
}

function PasteItem({ paste, first }: { paste: PasteSummary; first: "paste" | "copy" }) {
  const language = languageLabel(paste)
  return (
    <List.Item
      icon={Icon.Code}
      title={paste.title}
      subtitle={paste.description || undefined}
      keywords={paste.tags}
      accessories={[
        ...(language ? [{ tag: language }] : []),
        {
          icon: VISIBILITY_ICON[paste.visibility],
          tooltip: visibilityLabel(paste.visibility),
        },
        { date: new Date(paste.updatedAt) },
      ]}
      actions={
        <ActionPanel>
          <CodeActions paste={paste} first={first} />
          <Action.Push
            icon={Icon.Eye}
            title={messages.show}
            target={<PasteDetail summary={paste} first={first} />}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
          />
          <LinkActions paste={paste} />
        </ActionPanel>
      }
    />
  )
}
