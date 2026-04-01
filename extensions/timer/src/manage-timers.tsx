import { List, ActionPanel, Action, Icon, Color, showHUD, confirmAlert, Alert } from "@raycast/api"
import { useState, useEffect, useCallback } from "react"
import { getTimers, saveTimers, removeTimer, timerDisplayName } from "./lib/store"
import { formatRemaining } from "./lib/parse"
import type { Timer } from "./lib/store"

function remainingSeconds(timer: Timer): number {
  return Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000))
}

export default function ManageTimers() {
  const [timers, setTimers] = useState<Timer[]>([])

  const loadTimers = useCallback(async () => {
    const stored = await getTimers()
    const active = stored.filter((t) => t.endsAt > Date.now())
    if (active.length < stored.length) {
      await saveTimers(active)
    }
    setTimers(active)
  }, [])

  useEffect(() => {
    loadTimers()
    const interval = setInterval(loadTimers, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleDelete(timer: Timer) {
    await removeTimer(timer.id)
    setTimers((prev) => prev.filter((t) => t.id !== timer.id))
    await showHUD(`Cancelled: ${timerDisplayName(timer)}`)
  }

  async function handleDeleteAll() {
    const confirmed = await confirmAlert({
      title: "Delete All Timers",
      message: "This will cancel all timers.",
      primaryAction: {
        title: "Delete All",
        style: Alert.ActionStyle.Destructive,
      },
    })
    if (!confirmed) return
    await saveTimers([])
    setTimers([])
  }

  return (
    <List>
      {timers.map((timer) => (
        <List.Item
          key={timer.id}
          title={timerDisplayName(timer)}
          subtitle={formatRemaining(remainingSeconds(timer))}
          icon={Icon.Clock}
          accessories={[
            ...(timer.message ? [{ text: timer.timeLabel }] : []),
            { tag: { value: "Running", color: Color.Green } },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Cancel Timer"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(timer)}
              />
              {timers.length > 1 && (
                <Action
                  title="Cancel All"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={handleDeleteAll}
                />
              )}
            </ActionPanel>
          }
        />
      ))}

      {timers.length === 0 && (
        <List.EmptyView title="No Timers" description={'Type "timer 30m check slack" to start one'} icon={Icon.Clock} />
      )}
    </List>
  )
}
