export interface ParsedTime {
  totalSeconds: number
  timeLabel: string
  message: string | null
}

export function parseTime(input: string): ParsedTime | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()

  let hours = 0
  let minutes = 0
  let seconds = 0
  let matched = false
  let lastTimeEnd = 0

  const hourMatch = lower.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)/)
  if (hourMatch) {
    hours = parseInt(hourMatch[1])
    matched = true
    lastTimeEnd = Math.max(lastTimeEnd, hourMatch.index! + hourMatch[0].length)
  }

  const minMatch = lower.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/)
  if (minMatch) {
    minutes = parseInt(minMatch[1])
    matched = true
    lastTimeEnd = Math.max(lastTimeEnd, minMatch.index! + minMatch[0].length)
  }

  const secMatch = lower.match(/(\d+)\s*(?:s|sec|secs|second|seconds)/)
  if (secMatch) {
    seconds = parseInt(secMatch[1])
    matched = true
    lastTimeEnd = Math.max(lastTimeEnd, secMatch.index! + secMatch[0].length)
  }

  if (!matched) {
    const plainNumber = lower.match(/^(\d+)(?:\s|$)/)
    if (plainNumber) {
      minutes = parseInt(plainNumber[1])
      matched = true
      lastTimeEnd = plainNumber[0].trimEnd().length
    }
  }

  if (!matched) return null

  const totalSeconds = hours * 3600 + minutes * 60 + seconds
  if (totalSeconds <= 0) return null

  const parts = []
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  if (seconds) parts.push(`${seconds}s`)

  const remainder = trimmed.slice(lastTimeEnd).trim()

  return {
    totalSeconds,
    timeLabel: parts.join(""),
    message: remainder || null,
  }
}

export function formatRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return "Done"

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
