import { Color } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { Agent } from "./cursor";

/**
 * Get agents that have finished but haven't been seen by the user yet
 */
export function getNewFinishedAgents(agents: Agent[], lastSeenFinishedAgents: string[]): Agent[] {
  return agents.filter((agent) => agent.status === "FINISHED" && !lastSeenFinishedAgents.includes(agent.id));
}

/**
 * Get agents that have errored but haven't been seen by the user yet
 */
export function getNewErrorAgents(agents: Agent[], lastSeenErrorAgents: string[]): Agent[] {
  return agents.filter((agent) => agent.status === "ERROR" && !lastSeenErrorAgents.includes(agent.id));
}

/**
 * Get the appropriate menu bar icon based on agent statuses and notification state
 */
export function getNotificationStatusIcon(
  agents?: Agent[],
  lastSeenFinishedAgents: string[] = [],
  lastSeenErrorAgents: string[] = [],
) {
  if (!agents || agents.length === 0) {
    return { source: "icon-mono.svg", tintColor: Color.PrimaryText };
  }

  // Priority 1: New error agents (notification style - higher priority than finished)
  const newErrorAgents = getNewErrorAgents(agents, lastSeenErrorAgents);
  if (newErrorAgents.length > 0) {
    return "icon-error.svg";
  }

  // Priority 2: New finished agents (notification style)
  const newFinishedAgents = getNewFinishedAgents(agents, lastSeenFinishedAgents);
  if (newFinishedAgents.length > 0) {
    return "icon-finished.svg";
  }

  // Priority 4: Any running agent (always show)
  if (agents.find((agent) => agent.status === "CREATING" || agent.status === "RUNNING")) {
    return "icon-running.svg";
  }

  // Default state
  return { source: "icon-mono.svg", tintColor: Color.PrimaryText };
}

/**
 * Custom hook to manage agent notification state
 * Automatically marks finished and error agents as "seen" when the component mounts/updates
 */
export function useAgentNotifications(agents?: Agent[]) {
  const [lastSeenFinishedAgents, setLastSeenFinishedAgents] = useCachedState<string[]>("lastSeenFinishedAgents", []);
  const [lastSeenErrorAgents, setLastSeenErrorAgents] = useCachedState<string[]>("lastSeenErrorAgents", []);

  const runningAgents = agents?.filter((agent) => agent.status === "CREATING" || agent.status === "RUNNING") || [];
  const newFinishedAgents = agents ? getNewFinishedAgents(agents, lastSeenFinishedAgents) : [];
  const newErrorAgents = agents ? getNewErrorAgents(agents, lastSeenErrorAgents) : [];

  // Auto-acknowledge: Mark finished and error agents as seen when menu bar is viewed
  useEffect(() => {
    if (agents) {
      // Handle new finished agents
      if (newFinishedAgents.length > 0) {
        const allFinishedAgentIds = agents.filter((agent) => agent.status === "FINISHED").map((agent) => agent.id);
        setLastSeenFinishedAgents(allFinishedAgentIds);
      }

      // Handle new error agents
      if (newErrorAgents.length > 0) {
        const allErrorAgentIds = agents.filter((agent) => agent.status === "ERROR").map((agent) => agent.id);
        setLastSeenErrorAgents(allErrorAgentIds);
      }
    }
  }, [agents, newFinishedAgents.length, newErrorAgents.length, setLastSeenFinishedAgents, setLastSeenErrorAgents]);

  // Determine what to show in title: running > errors > finished
  const titleCount =
    runningAgents.length > 0
      ? runningAgents.length.toString()
      : newErrorAgents.length > 0
        ? newErrorAgents.length.toString()
        : newFinishedAgents.length > 0
          ? newFinishedAgents.length.toString()
          : undefined;

  // Get the appropriate status icon
  const statusIcon = getNotificationStatusIcon(agents, lastSeenFinishedAgents, lastSeenErrorAgents);

  return {
    runningAgents,
    newFinishedAgents,
    newErrorAgents,
    lastSeenFinishedAgents,
    lastSeenErrorAgents,
    titleCount,
    statusIcon,
  };
}
