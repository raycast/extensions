import { showHUD, LaunchProps } from "@raycast/api"
import { randomUUID } from "node:crypto"
import { parseTime } from "./lib/parse"
import { addTimer, removeTimer, timerExists, timerDisplayName } from "./lib/store"
import { playSound } from "./lib/notify"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default async function StartTimer(props: LaunchProps<{ arguments: { input: string } }>) {
  const parsed = parseTime(props.arguments.input)
  if (!parsed) {
    await showHUD("Invalid time — use e.g. 30m, 1h30m, 3s")
    return
  }

  const now = Date.now()
  const timer = {
    id: randomUUID(),
    timeLabel: parsed.timeLabel,
    message: parsed.message,
    totalSeconds: parsed.totalSeconds,
    startedAt: now,
    endsAt: now + parsed.totalSeconds * 1000,
  }

  await addTimer(timer)

  const name = timerDisplayName(timer)
  const hudText = timer.message ? `Timer set — ${name} (${timer.timeLabel})` : `Timer set — ${name}`
  await showHUD(hudText)

  while (Date.now() < timer.endsAt) {
    await sleep(1000)
    if (!(await timerExists(timer.id))) return
  }

  playSound()
  await showHUD(`${name} — time's up!`)
  await removeTimer(timer.id)
}
