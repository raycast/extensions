import { SITE_URL } from "./wiro";

// Deployed agents: their status and credits (UserAgent/MyAgents) and the reply
// to a message (UserAgent/Message/Detail).

const STATUS_LABELS = ["Stopped", "Stopping", "Queued", "Starting", "Running", "Error", "Setup required"];
export const RUNNING_STATUS = 4;

export interface AgentSummary {
  guid: string;
  title: string;
  status: number | null;
  statusLabel: string;
  running: boolean;
  creditsLeft: number;
  team: boolean;
  url: string;
}

function asNumber(value: unknown): number | null {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) ? null : number;
}

export function toAgentSummary(row: Record<string, unknown>): AgentSummary {
  const status = asNumber(row.status);
  const guid = typeof row.guid === "string" ? row.guid : "";
  return {
    guid,
    title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Agent",
    status: status === null ? null : Math.trunc(status),
    statusLabel: status !== null && status >= 0 && status < STATUS_LABELS.length ? STATUS_LABELS[status] : "Unknown",
    running: status === RUNNING_STATUS,
    creditsLeft: asNumber(row.remainingcredits) ?? 0,
    team: Boolean(row.teamguid),
    url: `${SITE_URL}/panel/agents/${guid}`,
  };
}

const TERMINAL = new Set(["agent_end", "agent_error", "agent_cancel", "agent_done"]);

export function isMessageFinished(status: unknown): boolean {
  return TERMINAL.has(String(status));
}

export function messageFailed(status: unknown): boolean {
  return status === "agent_error" || status === "agent_cancel";
}

function sortedBlocks(timeline: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(timeline)) return [];
  return timeline
    .filter((block): block is Record<string, unknown> => Boolean(block) && typeof block === "object")
    .map((block, index) => ({ block, index }))
    .sort((a, b) => (Number(a.block.order ?? a.index) || 0) - (Number(b.block.order ?? b.index) || 0))
    .map(({ block }) => block);
}

/** The agent's reply: its response, else the answer blocks of its timeline, else its standard output. */
export function agentReply(row: Record<string, unknown>): string {
  const response = typeof row.response === "string" ? row.response.trim() : "";
  if (response) return response;
  const answer = sortedBlocks(row.timeline)
    .filter((block) => block.type === "answer" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("")
    .trim();
  if (answer) return answer;
  return typeof row.debugoutput === "string" ? row.debugoutput.trim() : "";
}

/** Files the reply links to on Wiro's hosts, each on its own line or after "MEDIA:". */
export function replyMedia(reply: string): string[] {
  const urls: string[] = [];
  for (const line of reply.split("\n")) {
    const match = /^\s*(?:MEDIA:\s*)?(https?:\/\/\S+)\s*$/i.exec(line);
    const url =
      match?.[1] ??
      /(https?:\/\/cdn\d*\.wiro\.ai\/\S+\.(?:png|jpe?g|webp|gif|mp4|mov|webm|mp3|wav|m4a))/i.exec(line)?.[1];
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}
