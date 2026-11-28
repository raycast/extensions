import { useEffect, useRef, useState } from "react"
import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api"
import { getCatalog, postCapture, captureIdentity, type CatalogResult, type TuckResult } from "./client"
import {
  MAX_CAPTURE_LENGTH,
  insertToken,
  pickerRows,
  type Catalog,
  type ListenerStatus,
  type OpenToken,
  type PickerRow,
} from "./line"
import { failureLabel, receiptLabel } from "./messages"
import { parsePairLink, type Pair } from "./pair"

type TuckArguments = {
  text?: string
}

type Preferences = {
  pairLink: string
}

export default function Command(props: LaunchProps<{ arguments: TuckArguments }>) {
  const pair = parsePairLink(getPreferenceValues<Preferences>().pairLink)
  const port = pair?.port
  const bearer = pair?.token
  const [line, setLine] = useState(props.arguments.text ?? "")
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [status, setStatus] = useState<ListenerStatus>("ready")
  const [loading, setLoading] = useState(Boolean(pair))
  const [busy, setBusy] = useState(false)
  const identity = useRef<{ key: string; id: string } | null>(null)
  const token = useRef<OpenToken | null>(null)

  useEffect(() => {
    if (port == null || !bearer) return
    const active: Pair = { port, token: bearer }
    let cancelled = false
    void getCatalog(active).then((result) => {
      if (cancelled) return
      applyCatalog(result, setCatalog, setStatus)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [port, bearer])

  if (!pair) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Link}
          title="Paste the pair link"
          description="In the Tuck menu bar, choose Copy pair link, then paste it into this command’s preferences."
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    )
  }

  const view = pickerRows(line, { catalog, status })
  token.current = view.token

  return (
    <List
      filtering={false}
      isLoading={loading || busy}
      searchText={line}
      searchBarPlaceholder="Tuck a thought"
      throttle={false}
      onSearchTextChange={setLine}
    >
      <List.Section title={sectionTitle(view.token)}>
        {view.rows.map((row) => (
          <List.Item
            key={row.id}
            icon={rowIcon(row, view.token)}
            title={row.title}
            subtitle={row.subtitle}
            actions={
              <RowActions
                row={row}
                onInsert={(slug) => {
                  const open = token.current
                  if (!open) return
                  setLine(insertToken(line, open, slug))
                }}
                onTuck={() => void tuck(pair, line, identity, setBusy)}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  )
}

function RowActions({
  row,
  onInsert,
  onTuck,
}: {
  row: PickerRow
  onInsert: (slug: string) => void
  onTuck: () => void
}) {
  if (row.role === "insert" && row.slug) {
    const title = row.title.startsWith("Create ") ? row.title : `Insert ${row.subtitle}`
    return (
      <ActionPanel>
        <Action title={title} icon={Icon.Plus} onAction={() => onInsert(row.slug!)} />
        {/* Second action, so Raycast gives it ⌘↩. */}
        <Action title="Tuck This" icon={Icon.Check} onAction={onTuck} />
      </ActionPanel>
    )
  }
  if (row.role === "hint") {
    return (
      <ActionPanel>
        <Action title="Tuck This" icon={Icon.Check} onAction={onTuck} />
      </ActionPanel>
    )
  }
  return (
    <ActionPanel>
      <Action title="Tuck This" icon={Icon.Check} onAction={onTuck} />
    </ActionPanel>
  )
}

function sectionTitle(token: OpenToken | null) {
  if (!token) return "Tuck"
  if (token.kind === "#") return "Tags"
  if (token.kind === "@") return "People"
  return "Brains"
}

function rowIcon(row: PickerRow, token: OpenToken | null) {
  if (row.role === "tuck") return Icon.Check
  if (row.role === "hint") return Icon.Pencil
  if (row.title.startsWith("Create ")) return Icon.Plus
  if (token?.kind === "@") return Icon.Person
  if (token?.kind === "/") return Icon.Folder
  return Icon.Tag
}

function applyCatalog(
  result: CatalogResult,
  setCatalog: (catalog: Catalog | null) => void,
  setStatus: (status: ListenerStatus) => void,
) {
  if (result.ok) {
    setCatalog(result.catalog)
    setStatus("ready")
    return
  }
  setCatalog(null)
  setStatus(result.reason)
}

async function tuck(
  pair: Pair,
  line: string,
  identity: { current: { key: string; id: string } | null },
  setBusy: (busy: boolean) => void,
) {
  const text = line.trim()
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Nothing to tuck" })
    return
  }
  if (text.length > MAX_CAPTURE_LENGTH) {
    await showToast({ style: Toast.Style.Failure, title: "That thought is too long" })
    return
  }
  identity.current = captureIdentity(text, identity.current, () => `raycast:${crypto.randomUUID()}`)
  setBusy(true)
  const toast = await showToast({ style: Toast.Style.Animated, title: "Tucking…" })
  let result: TuckResult
  try {
    result = await postCapture(pair, { id: identity.current.id, text })
  } finally {
    setBusy(false)
  }
  if (!result.ok) {
    toast.style = Toast.Style.Failure
    toast.title = failureLabel(result.reason, result.error)
    return
  }
  await toast.hide()
  await showHUD(receiptLabel(result.status))
}
