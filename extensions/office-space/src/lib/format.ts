import { Color, Icon, Image } from "@raycast/api";
import { homedir } from "node:os";
import { Agent, AgentStatus, TokenUsage } from "./types";

export const statusLabel: Record<AgentStatus, string> = {
  working: "Working",
  needsInput: "Needs you",
  finished: "Finished",
  idle: "Idle",
  ended: "Ended",
};

export function statusIcon(status: AgentStatus): Image.ImageLike {
  switch (status) {
    case "working":
      return { source: Icon.CircleProgress50, tintColor: Color.Blue };
    case "needsInput":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "finished":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "idle":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    case "ended":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
  }
}

export function needsYou(agent: Agent): boolean {
  return agent.status === "needsInput" || agent.status === "finished";
}

/** Office Space can type into it (it runs in a terminal the app hosts). */
export function canMessage(agent: Agent): boolean {
  return agent.terminalID !== undefined && agent.status !== "ended";
}

export function adapterName(agent: Agent): string {
  switch (agent.adapter) {
    case "claude-code":
      return "Claude Code";
    case "codex":
      return "Codex";
    default:
      return agent.command?.split(" ")[0] ?? "Command";
  }
}

export function abbreviate(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? "~" + path.slice(home.length) : path;
}

export function ago(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0)}k`;
  return `${(tokens / 1_000_000).toFixed(1)}M`;
}

export function formatCost(usage?: TokenUsage): string | undefined {
  if (usage?.costUSD === undefined) return undefined;
  return usage.costUSD > 0 && usage.costUSD < 0.01 ? "<$0.01" : `$${usage.costUSD.toFixed(2)}`;
}

/** What the agent is doing, in the agent's own words when it reported them. */
export function doing(agent: Agent): string | undefined {
  if (agent.status === "needsInput" && agent.statusDetail) return agent.statusDetail;
  return agent.reported ?? agent.currentTask ?? undefined;
}

export function place(agent: Agent): string {
  return agent.project?.name ?? agent.workingDirectory.split("/").pop() ?? agent.workingDirectory;
}

export function linkTo(route: string): string {
  return `officespace://${route}`;
}
