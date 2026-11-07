import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { useEffect, useState } from "react"
import { detailRows } from "./lib/dictation.ts"
import { GrokRuntime } from "./lib/grok.ts"
import { DictationHistory, type HistoryEntry } from "./lib/history.ts"

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })

export default function DictationHistoryCommand() {
  const [entries, setEntries] = useState<Option.Option<ReadonlyArray<HistoryEntry>>>(Option.none())

  const reload = () =>
    GrokRuntime.runFork(
      DictationHistory.use((history) => history.list).pipe(
        Effect.tap((list) => Effect.sync(() => setEntries(Option.some(list)))),
      ),
    )

  useEffect(() => {
    reload()
  }, [])

  const change = (program: Effect.Effect<void, unknown, DictationHistory>, failure: string) =>
    GrokRuntime.runFork(
      program.pipe(
        Effect.andThen(Effect.sync(reload)),
        Effect.catch(() => Effect.tryPromise(() => showToast({ style: Toast.Style.Failure, title: failure }))),
        Effect.ignore,
      ),
    )

  const remove = async (entry: HistoryEntry) => {
    const confirmed = await confirmAlert({
      title: "Delete this dictation?",
      message: "This removes it from this Mac.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    })

    if (confirmed) {
      change(
        DictationHistory.use((history) => history.remove(entry.id)),
        "Could not delete the dictation",
      )
    }
  }

  const clearAll = async () => {
    const confirmed = await confirmAlert({
      title: "Delete all dictations?",
      message: "This removes the dictation history from this Mac.",
      primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
    })

    if (confirmed) {
      change(
        DictationHistory.use((history) => history.clear),
        "Could not delete the dictations",
      )
    }
  }

  const list = Option.getOrElse(entries, (): ReadonlyArray<HistoryEntry> => [])

  return (
    <List isLoading={Option.isNone(entries)} isShowingDetail={list.length > 0} searchBarPlaceholder="Search dictations">
      <List.EmptyView
        icon={Icon.Microphone}
        title="No dictations yet"
        description="Run Dictate to add one. Turn off Keep History in the extension preferences to stop saving them."
      />
      {list.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.text}
          detail={
            <List.Item.Detail
              markdown={entry.text}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Dictated" text={dateFormat.format(entry.createdAt)} />
                  {detailRows(entry).map((row) => (
                    <List.Item.Detail.Metadata.Label key={row.title} title={row.title} text={row.text} />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Paste content={entry.text} />
              <Action.CopyToClipboard content={entry.text} />
              <Action
                title="Delete Dictation"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => void remove(entry)}
              />
              <Action
                title="Delete All Dictations"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                onAction={clearAll}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
