import { Color, Icon, Image, List } from "@raycast/api"
import { isEmpty } from "kickstart-utils"
import { format } from "date-fns"
import { DecisionState } from "../types/types"

export const getReviewersAccessory = (
  reviewers?: string[]
): List.Item.Accessory => {
  if (isEmpty(reviewers)) return {}
  return {
    tooltip: reviewers?.join("\n"),
    tag: "Reviewers",
  }
}
export const getCommentsAccessory = (
  commentCount?: number
): List.Item.Accessory => {
  if (!commentCount) return {}
  return {
    text: `${commentCount}`,
    icon: Icon.Bubble,
    tooltip: "Number of Comments",
  }
}
export const getUpdatedAtAccessory = (date?: Date): List.Item.Accessory => {
  if (!date) return {}
  return {
    date,
    tooltip: `Updated: ${format(date, "EEEE d MMMM yyyy 'at' HH:mm")}`,
  }
}
export const getAuthorAccessory = (
  author?: string,
  avatarUrl?: string
): List.Item.Accessory => {
  if (!author) return {}
  return {
    icon: {
      source: avatarUrl || "",
      mask: Image.Mask.Circle,
    },
    tooltip: `Author: ${author}`,
  }
}

export function getReviewDecisionAccessory(
  reviewDecisions?: DecisionState[]
): List.Item.Accessory {
  if (!reviewDecisions) return {}
  const hasState = (state: DecisionState) =>
    reviewDecisions.some((s) => s === state)
  if (hasState(DecisionState.APPROVED)) {
    return {
      tag: { value: "Approved", color: Color.Green },
    }
  }
  if (hasState(DecisionState.CHANGES_REQUESTED)) {
    return { tag: { value: "Changes requested", color: Color.Red } }
  }
  if (hasState(DecisionState.REVIEW_REQUIRED)) {
    return { tag: { value: "Review requested", color: Color.Orange } }
  }
  return {}
}
