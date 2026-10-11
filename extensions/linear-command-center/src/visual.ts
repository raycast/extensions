import { Color, Icon, Image } from "@raycast/api";
import { IssueWithContext } from "./types";

export function issueIcon(issue: IssueWithContext): Image.ImageLike {
  if (issue.agentSession?.status === "awaitingInput") {
    return { source: Icon.QuestionMark, tintColor: Color.Orange };
  }
  if (issue.agentSession?.status === "error") {
    return { source: Icon.ExclamationMark, tintColor: Color.Red };
  }
  if (issue.isBlocked) return { source: Icon.Stop, tintColor: Color.Red };
  if (issue.isOverdue) return { source: Icon.Clock, tintColor: Color.Red };
  if (issue.isReview) return { source: Icon.Eye, tintColor: Color.Purple };
  if (issue.isDelegated) return { source: Icon.Bolt, tintColor: Color.Blue };
  if (issue.state.type === "started") {
    return { source: Icon.CircleProgress75, tintColor: Color.Blue };
  }
  return { source: Icon.Circle, tintColor: issue.state.color };
}
