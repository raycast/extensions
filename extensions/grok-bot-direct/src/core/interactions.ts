import { ClientError, Entry, GrokClient, record } from "./client";

export interface Question {
  prompt: string;
  options: { label: string; value: string }[];
  answered?: string;
}
export interface Approval {
  requestId: string;
  summary: string;
  command: string;
  status: string;
}
export function questionOf(entry: Entry): Question | undefined {
  const message = entry.message;
  if (
    !record(message) ||
    message.type !== "widget" ||
    !record(message.widget) ||
    typeof message.widget.prompt !== "string"
  )
    return;
  const options = message.widget.options;
  if (
    options !== undefined &&
    (!Array.isArray(options) ||
      !options.every(
        (o) =>
          record(o) &&
          typeof o.label === "string" &&
          typeof o.value === "string",
      ))
  )
    return;
  return {
    prompt: message.widget.prompt,
    options: (options ?? []) as Question["options"],
    answered:
      typeof entry.respondedValue === "string"
        ? entry.respondedValue
        : undefined,
  };
}
export function approvalOf(entry: Entry): Approval | undefined {
  const message = entry.message;
  if (
    !record(message) ||
    message.type !== "auto-review-approval" ||
    !record(message.approval)
  )
    return;
  const approval = message.approval;
  if (
    typeof approval.requestId !== "string" ||
    typeof approval.summary !== "string" ||
    typeof approval.status !== "string"
  )
    return;
  return {
    requestId: approval.requestId,
    summary: approval.summary,
    command:
      typeof approval.command === "string"
        ? approval.command
        : JSON.stringify(approval.command ?? ""),
    status: approval.status,
  };
}
export async function answerQuestion(
  client: Pick<GrokClient, "transcript" | "command">,
  agentId: string,
  entry: Entry,
  value: string,
): Promise<void> {
  if (!value.trim()) throw new ClientError("Enter a response.");
  const current = (await client.transcript(agentId)).entries.find(
    (e) => e.id === entry.id,
  );
  const question = current && questionOf(current);
  if (!question || question.answered !== undefined)
    throw new ClientError(
      "This question is no longer awaiting a response. Refresh the conversation.",
    );
  const response = await client.command(
    "respondToWidget",
    { agentId, entryId: entry.id, value },
    { mutation: true },
  );
  if (!record(response) || response.accepted !== true)
    throw new ClientError(
      "The response was not confirmed. Refresh before trying again.",
      undefined,
      true,
    );
}
export async function resolveApproval(
  client: Pick<GrokClient, "transcript" | "command">,
  agentId: string,
  entry: Entry,
  resolution: "approved" | "denied",
): Promise<void> {
  const previous = approvalOf(entry);
  const current = (await client.transcript(agentId)).entries.find(
    (e) => e.id === entry.id,
  );
  const approval = current && approvalOf(current);
  if (
    !previous ||
    !approval ||
    approval.status !== "pending" ||
    approval.requestId !== previous.requestId ||
    approval.summary !== previous.summary ||
    approval.command !== previous.command
  )
    throw new ClientError(
      "This approval changed or is no longer pending. Refresh and review it again.",
    );
  await client.command(
    "resolveAutoReviewApproval",
    { agentId, entryId: entry.id, requestId: approval.requestId, resolution },
    { mutation: true },
  );
}
