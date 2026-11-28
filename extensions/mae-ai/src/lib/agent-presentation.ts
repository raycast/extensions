import {
  AgentApproval,
  AgentMessage,
  AgentState,
  terminal,
} from "./agents/types";
import { responseRows } from "./response-rows";

export function agentPresentation(
  messages: AgentMessage[],
  progress: string[],
  approvals: AgentApproval[],
  state: AgentState,
  error: string,
  rich: boolean,
) {
  const pendingApprovals = terminal(state) ? [] : approvals;
  const displayMessages =
    rich && state === "running" && messages.at(-1)?.role === "user"
      ? [...messages, { role: "assistant" as const, text: "" }]
      : messages;
  const rows = displayMessages.flatMap((message, index) =>
    (rich ? [message.text] : responseRows(message.text)).map((text, line) => ({
      id: rich ? `message-${index}` : `message-${index}-${line}`,
      text,
      role: message.role,
    })),
  );
  const status =
    state === "unknown"
      ? "Remote work is unconfirmed; reconnect before sending again."
      : state === "stopping"
        ? "Waiting for the remote executor to stop..."
        : state === "failed"
          ? "Remote request failed"
          : state === "cancelled"
            ? "Remote run stopped"
            : undefined;
  const itemIds = [
    ...rows.map((row) => row.id),
    ...progress.map((_, index) => `progress-${index}`),
    ...pendingApprovals.map((approval) => `approval-${approval.id}`),
    ...(status ? ["agent-state"] : []),
    ...(error ? ["agent-error"] : []),
  ];
  const latestId = error
    ? "agent-error"
    : pendingApprovals.length
      ? `approval-${pendingApprovals.at(-1)!.id}`
      : status
        ? "agent-state"
        : rows.at(-1)?.id ||
          (progress.length ? `progress-${progress.length - 1}` : undefined);
  return { rows, status, itemIds, latestId, approvals: pendingApprovals };
}
