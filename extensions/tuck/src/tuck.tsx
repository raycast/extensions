import { useEffect, useRef, useState } from "react"
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api"
import { usePromise } from "@raycast/utils"
import { getCatalog, postCapture, captureIdentity, type TuckResult } from "./client"
import { MAX_CAPTURE_LENGTH, insertToken, pickerRows, type OpenToken, type PickerRow } from "./line"
import { failureLabel, receiptLabel } from "./messages"
import { parsePairLink, type Pair } from "./pair"

export default function Command(props: LaunchProps<{ arguments: Arguments.Tuck }>) {
  const pair = parsePairLink(getPreferenceValues<Preferences>().pairLink)
  const port = pair?.port
  const bearer = pair?.token
  const [line, setLine] = useState(props.arguments.text ?? "")
  const [busy, setBusy] = useState(false)
  const identity = useRef<{ key: string; id: string } | null>(null)
  const token = useRef<OpenToken | null>(null)
  // Reload Names runs this again, so names come back after Tuck is opened or unlocked.
  const {
    data: names,
    isLoading: loading,
    revalidate,
  } = usePromise(
    async (listenerPort?: number, listenerToken?: string) =>
      listenerPort != null && listenerToken ? getCatalog({ port: listenerPort, token: listenerToken }) : null,
    [port, bearer],
  )
  const catalog = names?.ok ? names.catalog : null
  const status = names && !names.ok ? names.reason : "ready"
  // Opening a picker without names asks Tuck again, so they come back once Tuck is open and
  // unlocked, with nothing to press.
  const pickerKind = pair ? (pickerRows(line, { catalog, status }).token?.kind ?? null) : null
  const namesMissing = useRef(false)
  namesMissing.current = names != null && !names.ok
  // Only when a picker opens, never on each answer, or a closed Tuck would be asked in a loop.
  useEffect(() => {
    if (pickerKind && namesMissing.current) revalidate()
  }, [pickerKind, revalidate])

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
  // While names are on their way, a picker would list Create alone and Raycast would keep it
  // selected once the real names arrive above it. Show the loading bar instead.
  const rows = view.token && loading && !catalog ? [] : view.rows

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
        {rows.map((row) => (
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
                onReload={revalidate}
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
  onReload,
}: {
  row: PickerRow
  onInsert: (slug: string) => void
  onTuck: () => void
  onReload: () => void
}) {
  if (row.role === "insert" && row.slug) {
    const title = row.title.startsWith("Create ") ? row.title : `Insert ${row.subtitle}`
    return (
      <ActionPanel>
        <Action title={title} icon={Icon.Plus} onAction={() => onInsert(row.slug!)} />
        {/* Second action, so Raycast gives it ⌘↩. */}
        <Action title="Tuck This" icon={Icon.Check} onAction={onTuck} />
        {/* Third at the earliest: Raycast gives ⌘↩ to whatever is second, shortcut or not. */}
        <Action
          title="Reload Names"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onReload}
        />
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
  // Held locally: a second submit during the awaits below replaces identity.current.
  const capture = captureIdentity(text, identity.current, () => `raycast:${crypto.randomUUID()}`)
  identity.current = capture
  setBusy(true)
  const toast = await showToast({ style: Toast.Style.Animated, title: "Tucking…" })
  let result: TuckResult
  try {
    result = await postCapture(pair, { id: capture.id, text })
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
