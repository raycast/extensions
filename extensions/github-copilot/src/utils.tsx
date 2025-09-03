import { Icon, Color } from "@raycast/api";
import { PullRequestWithAgentSessions, AgentSessionState } from "./services/copilot";

export function getIcon(pullRequestWithAgentSessions: PullRequestWithAgentSessions) {
  if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.QUEUED) {
    return { source: Icon.CircleEllipsis, tintColor: Color.Yellow };
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.IN_PROGRESS) {
    return { source: Icon.CircleProgress, tintColor: Color.Yellow };
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.FAILED) {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.TIMED_OUT) {
    return { source: Icon.XMarkCircleHalfDash, tintColor: Color.Red };
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.CANCELLED) {
    return { source: Icon.XMarkCircle, tintColor: Color.Green };
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.COMPLETED) {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  } else {
    return { source: Icon.Circle, tintColor: Color.Blue };
  }
}
