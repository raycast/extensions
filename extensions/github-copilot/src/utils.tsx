import { Color, Image, Keyboard } from "@raycast/api";
import { PullRequestWithAgentSessions, AgentSessionState } from "./services/copilot";

export function getIcon(pullRequestsWithAgentSessions: PullRequestWithAgentSessions): Image.ImageLike {
  const source = getIconPath(pullRequestsWithAgentSessions);

  return { source, tintColor: Color.PrimaryText };
}

export function getIconPath(pullRequestWithAgentSessions: PullRequestWithAgentSessions): string {
  if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.QUEUED) {
    return "clock.svg";
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.IN_PROGRESS) {
    return "sync.svg";
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.FAILED) {
    return "stop.svg";
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.TIMED_OUT) {
    return "stop.svg";
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.CANCELLED) {
    return "skip.svg";
  } else if (pullRequestWithAgentSessions.sessions[0].state === AgentSessionState.COMPLETED) {
    return "check-circle-fill.svg";
  } else {
    return "circle.svg";
  }
}

export function getMenuBarShortcut(index: number) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = {
      modifiers: ["cmd"],
      key: String(key) as Keyboard.KeyEquivalent,
    };
  }

  return shortcut;
}

export const truncate = (text: string, maxLength: number): string => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + "...";
  }
  return text;
};
