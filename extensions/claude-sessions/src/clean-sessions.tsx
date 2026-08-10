import { useState, useEffect } from "react"
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api"
import { showFailureToast } from "@raycast/utils"
import { findCleanItems } from "./lib/clean"
import type { CleanItem } from "./types"

const REASON_COLOR: Record<CleanItem["reason"], Color> = {
  "ghost (directory deleted)": Color.Red,
  "no history": Color.Yellow,
  "orphaned history": Color.Purple,
}

const REASON_ICON: Record<CleanItem["reason"], Icon> = {
  "ghost (directory deleted)": Icon.XMarkCircle,
  "no history": Icon.MinusCircle,
  "orphaned history": Icon.Folder,
}

const CleanSessions = () => {
  const [items, setItems] = useState<CleanItem[] | null>(null)

  const reload = () => {
    setItems(null)
    findCleanItems()
      .then(setItems)
      .catch(() => setItems([]))
  }

  useEffect(() => {
    findCleanItems()
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  const removeOne = async (item: CleanItem) => {
    const confirmed = await confirmAlert({
      title: "Remove session?",
      message: item.label,
      rememberUserChoice: true,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    })
    if (!confirmed) return
    try {
      await item.execute()
      setItems((prev) => prev?.filter((i) => i.label !== item.label) ?? null)
      await showToast({ style: Toast.Style.Success, title: "Entry removed" })
    } catch (err) {
      await showFailureToast(err, { title: "Failed to remove entry" })
    }
  }

  const removeAll = async (reason: CleanItem["reason"], group: CleanItem[]) => {
    const confirmed = await confirmAlert({
      title: `Remove all ${group.length} "${reason}" entries?`,
      message: "This cannot be undone.",
      primaryAction: {
        title: "Remove All",
        style: Alert.ActionStyle.Destructive,
      },
    })
    if (!confirmed) return
    try {
      for (const item of group) await item.execute()
      setItems((prev) => prev?.filter((i) => i.reason !== reason) ?? null)
      await showToast({
        style: Toast.Style.Success,
        title: `Removed ${group.length} entries`,
      })
    } catch (err) {
      await showFailureToast(err, { title: "Failed to remove entries" })
    }
  }

  const grouped = (items ?? []).reduce<
    Record<CleanItem["reason"], CleanItem[]>
  >(
    (acc, item) => {
      ;(acc[item.reason] ??= []).push(item)
      return acc
    },
    {} as Record<CleanItem["reason"], CleanItem[]>,
  )

  const reasons = Object.keys(grouped) as CleanItem["reason"][]

  return (
    <List isLoading={items === null} searchBarPlaceholder="Search entries…">
      {items !== null && items.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          title="All clean!"
          description="No ghost entries, empty histories, or orphaned directories found."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={reload}
              />
            </ActionPanel>
          }
        />
      ) : (
        reasons.map((reason) => (
          <List.Section
            key={reason}
            title={reason}
            subtitle={`${grouped[reason].length}`}
          >
            {grouped[reason].map((item) => (
              <List.Item
                key={item.label}
                icon={{
                  source: REASON_ICON[reason],
                  tintColor: REASON_COLOR[reason],
                }}
                title={item.label}
                accessories={[
                  { tag: { value: reason, color: REASON_COLOR[reason] } },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Remove Session"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => removeOne(item)}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                    <Action
                      title={`Remove All ${grouped[reason].length} in This Group`}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={() => removeAll(reason, grouped[reason])}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={reload}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  )
}

export default CleanSessions
