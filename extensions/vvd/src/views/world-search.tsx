import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api"
import { useCachedPromise, useCachedState } from "@raycast/utils"
import { useState } from "react"

import { ApiErrorEmptyView } from "../components/status-views"
import { documentKind } from "../lib/document-kinds"
import { documentUrl, worldUrl } from "../lib/urls"
import {
  type Connection,
  type World,
  canEdit,
  getDocument,
  listDocuments,
  searchWorld,
} from "../lib/vvd"
import { CaptureForm } from "./capture-form"

/** The world a search opens on — remembered across commands. */
export const LAST_WORLD_KEY = "vvd.lastWorldId"

interface Row {
  /** The world the row was read from — a row from another world is never shown. */
  worldId: string
  id: string
  name: string
  documentType: string
  /** The matching passage for a content hit; nothing for a name hit. */
  snippet: string | null
  updatedAt: string | null
}

/** Plain text a detail pane shows before it gets unwieldy. */
const DETAIL_TEXT_CAP = 6_000

export function WorldSearch({
  connection,
  worlds,
  initialWorldId,
}: {
  connection: Connection
  worlds: World[]
  initialWorldId?: string
}) {
  const [lastWorldId, setLastWorldId] = useCachedState<string>(
    LAST_WORLD_KEY,
    "",
  )
  const [pickedWorldId, setPickedWorldId] = useState(
    initialWorldId ?? lastWorldId,
  )
  const world = worlds.find((w) => w.id === pickedWorldId) ?? worlds[0]!
  const [searchText, setSearchText] = useState("")
  const [showDetail, setShowDetail] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const query = searchText.trim()

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (
      _origin: string,
      _fingerprint: string,
      worldId: string,
      q: string,
    ): Promise<Row[]> => {
      if (q) {
        return (await searchWorld(connection, worldId, q)).map((r) => ({
          worldId,
          id: r.documentId,
          name: r.name,
          documentType: r.documentType,
          snippet: r.match === "content" ? r.snippet : null,
          updatedAt: null,
        }))
      }
      return (await listDocuments(connection, worldId, { limit: 50 })).map(
        (d) => ({
          worldId,
          id: d.id,
          name: d.name,
          documentType: d.documentType,
          snippet: null,
          updatedAt: d.updatedAt,
        }),
      )
    },
    [connection.origin, connection.fingerprint, world.id, query],
    { keepPreviousData: true, onError: () => {} },
  )
  // keepPreviousData keeps the last rows while a new query loads — right within
  // one world, wrong across a world switch (their ids would be opened under the
  // new world's slug). Only rows from the selected world are ever shown.
  const rows = (data ?? []).filter((row) => row.worldId === world.id)

  const pickWorld = (id: string) => {
    setPickedWorldId(id)
    setLastWorldId(id)
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search ${world.name}…`}
      isShowingDetail={showDetail && rows.length > 0}
      onSelectionChange={setSelectedId}
      searchBarAccessory={
        <List.Dropdown tooltip="World" value={world.id} onChange={pickWorld}>
          {worlds.map((w) => (
            <List.Dropdown.Item
              key={w.id}
              value={w.id}
              title={w.name}
              icon={Icon.Globe}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error && rows.length === 0 ? (
        <ApiErrorEmptyView
          error={error}
          origin={connection.origin}
          retry={revalidate}
        />
      ) : rows.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={query ? "Nothing matched" : "Nothing here yet"}
          description={
            query
              ? `No card or document in ${world.name} mentions “${query}”.`
              : `${world.name} has no documents yet.`
          }
          actions={
            <ActionPanel>
              {canEdit(world) ? (
                <Action.Push
                  title={query ? `Capture “${query}”` : "Quick Capture"}
                  icon={Icon.Plus}
                  target={
                    <CaptureForm
                      connection={connection}
                      worlds={worlds}
                      initialWorldId={world.id}
                      draftValues={query ? { title: query } : undefined}
                    />
                  }
                />
              ) : null}
              <Action.OpenInBrowser
                title="Open World in Browser"
                url={worldUrl(connection.origin, world.slug)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={query ? "Matches" : "Recently edited"}
          subtitle={world.name}
        >
          {rows.map((row) => {
            const kind = documentKind(row.documentType)
            const url = documentUrl(connection.origin, world.slug, row.id)
            return (
              <List.Item
                key={row.id}
                id={row.id}
                icon={Icon[kind.icon]}
                title={row.name}
                subtitle={showDetail ? undefined : (row.snippet ?? undefined)}
                keywords={[kind.label]}
                accessories={
                  showDetail
                    ? undefined
                    : [
                        ...(row.updatedAt
                          ? [{ date: new Date(row.updatedAt) }]
                          : []),
                        {
                          tag: {
                            value: kind.label,
                            color: Color.SecondaryText,
                          },
                        },
                      ]
                }
                detail={
                  showDetail && selectedId === row.id ? (
                    <DocumentPane
                      connection={connection}
                      world={world}
                      row={row}
                      url={url}
                    />
                  ) : undefined
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser title="Open in Browser" url={url} />
                      <Action
                        title={showDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        shortcut={{
                          macOS: { modifiers: ["cmd"], key: "d" },
                          Windows: { modifiers: ["ctrl"], key: "d" },
                        }}
                        onAction={() => setShowDetail((v) => !v)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Link"
                        content={url}
                        shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
                      />
                      <Action.CopyToClipboard
                        title="Copy Document ID"
                        content={row.id}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {canEdit(world) ? (
                        <Action.Push
                          title="Quick Capture Here"
                          icon={Icon.Plus}
                          shortcut={Keyboard.Shortcut.Common.New}
                          target={
                            <CaptureForm
                              connection={connection}
                              worlds={worlds}
                              initialWorldId={world.id}
                            />
                          }
                        />
                      ) : null}
                      <Action.OpenInBrowser
                        title="Open World in Browser"
                        icon={Icon.Globe}
                        url={worldUrl(connection.origin, world.slug)}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            )
          })}
        </List.Section>
      )}
    </List>
  )
}

/** The selected document's live text, read on demand — one fetch per selection. */
function DocumentPane({
  connection,
  world,
  row,
  url,
}: {
  connection: Connection
  world: World
  row: Row
  url: string
}) {
  const kind = documentKind(row.documentType)
  const { data, isLoading, error } = useCachedPromise(
    async (
      _origin: string,
      _fingerprint: string,
      worldId: string,
      documentId: string,
    ) => getDocument(connection, worldId, documentId),
    [connection.origin, connection.fingerprint, world.id, row.id],
    { onError: () => {} },
  )

  const text = data?.content.text?.trim() ?? ""
  const body = text
    ? text.length > DETAIL_TEXT_CAP
      ? `${text.slice(0, DETAIL_TEXT_CAP)}…`
      : text
    : data
      ? "_No text yet._"
      : ""
  const markdown = error
    ? `# ${row.name}\n\n_Couldn't load this document's text._`
    : data
      ? `# ${data.name}\n\n${body}`
      : `# ${row.name}`
  const updated = data?.updatedAt ?? row.updatedAt

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={kind.label}
            icon={Icon[kind.icon]}
          />
          <List.Item.Detail.Metadata.Label
            title="World"
            text={world.name}
            icon={Icon.Globe}
          />
          {updated ? (
            <List.Item.Detail.Metadata.Label
              title="Updated"
              text={new Date(updated).toLocaleString()}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Open"
            target={url}
            text="in vvd"
          />
        </List.Item.Detail.Metadata>
      }
    />
  )
}
