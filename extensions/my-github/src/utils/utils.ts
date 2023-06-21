import { Usage } from "../types/types"
import { Color } from "@raycast/api"

export function getDecayScore(lastUsed?: Date): number {
  if (!lastUsed) return 0
  const decayRate = -Math.log(2) / 7
  const diffDays = Math.ceil(
    Math.abs(Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24)
  )
  return Math.exp(decayRate * diffDays)
}

export function getFrequencyScore(usageCount?: number): number {
  if (!usageCount) return 0
  return Math.log(1 + usageCount)
}

export function getCalculatedScore(usage: Usage = {}): number {
  const { lastUsed, usageCount } = usage
  const decayScore = getDecayScore(lastUsed)
  const frequencyScore = getFrequencyScore(usageCount)
  return decayScore * frequencyScore
}

export function getPrIcon(isDraft?: boolean) {
  if (isDraft) {
    return {
      value: {
        source: "pull-request-draft.svg",
        tintColor: Color.SecondaryText,
      },
      tooltip: `Status: Draft`,
    }
  }

  return {
    value: {
      source: "pull-request.svg",
      tintColor: Color.Green,
    },
    tooltip: `Status: Open`,
  }
}
