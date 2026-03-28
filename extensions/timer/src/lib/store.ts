import { LocalStorage } from "@raycast/api"

export interface Timer {
  id: string
  timeLabel: string
  message: string | null
  totalSeconds: number
  startedAt: number
  endsAt: number
}

const STORAGE_KEY = "timers"

export async function getTimers(): Promise<Timer[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY)
  if (!raw) return []
  return JSON.parse(raw)
}

export async function saveTimers(timers: Timer[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(timers))
}

export async function addTimer(timer: Timer): Promise<void> {
  const timers = await getTimers()
  timers.unshift(timer)
  await saveTimers(timers)
}

export async function removeTimer(id: string): Promise<void> {
  const timers = await getTimers()
  await saveTimers(timers.filter((t) => t.id !== id))
}

export async function timerExists(id: string): Promise<boolean> {
  const timers = await getTimers()
  return timers.some((t) => t.id === id)
}

export function timerDisplayName(timer: Timer): string {
  return timer.message ?? timer.timeLabel
}
