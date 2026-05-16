import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { getPreferences } from "../lib/preferences";
import { assertWritable, readOnlyConfirmation } from "../lib/readonly";
import { DraftResponse } from "../lib/responses";
import { flattenMarkdownLinks, splitList } from "../lib/text";
import { DraftEmailInput, validate } from "../lib/validation";

/**
 * Input parameters for the draft-email tool.
 *
 * Composes a new draft or updates an existing one through Superhuman's
 * `create_or_update_draft` MCP endpoint. Prefer `instructions` (natural
 * language; Superhuman's AI writer composes in the user's voice) over
 * `body` (literal HTML, bypasses the AI). Either is required; `forward`
 * requires `body` for the intro because the server appends the quoted
 * message.
 */
type Input = {
  /** Existing draft id to update in-place. Omit to create. */
  draftId?: string;
  /** Compose flavor. Defaults to "new" on the server when omitted. */
  type?: "new" | "reply" | "reply_all" | "forward";
  /** For reply / reply_all / forward: the thread the draft belongs to. */
  threadId?: string;
  /** For reply / reply_all / forward: the source message id. */
  messageId?: string;
  /** Send-from alias (email address or alias identifier). */
  from?: string;
  /** Comma-separated "To" recipients (e.g. "a@x.com, b@x.com"). */
  recipient?: string;
  /** Comma-separated CC recipients. */
  cc?: string;
  /** Comma-separated BCC recipients. */
  bcc?: string;
  /** Subject line. */
  subject?: string;
  /**
   * Natural-language instructions for the AI writer (preferred). Example:
   * "Reply telling them I'll send the deck by Friday and want a 30-min sync".
   */
  instructions?: string;
  /**
   * Literal body content (HTML or plain text). Bypasses the AI writer.
   * For `type: "forward"` use this for the intro only; the server appends
   * the quoted message.
   */
  body?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const blocked = readOnlyConfirmation("draft-email");
  if (blocked) return blocked;

  const { enableDraftPreviews } = getPreferences();
  if (!enableDraftPreviews) return undefined;

  const recipients = splitList(input.recipient);
  if (recipients?.some((r) => !r.includes("@"))) {
    return {
      message: `⚠️ Recipient list contains an entry without an email address. Provide full addresses like "name@example.com".`,
      image: "⚠️",
    };
  }

  const info: { name: string; value: string }[] = [];
  if (input.type) info.push({ name: "Type", value: input.type });
  if (recipients) info.push({ name: "To", value: recipients.join(", ") });
  if (input.cc) info.push({ name: "CC", value: splitList(input.cc)?.join(", ") ?? "" });
  if (input.bcc) info.push({ name: "BCC", value: splitList(input.bcc)?.join(", ") ?? "" });
  if (input.from) info.push({ name: "From", value: input.from });
  if (input.subject) info.push({ name: "Subject", value: input.subject });
  if (input.instructions) info.push({ name: "Instructions", value: input.instructions });
  if (input.body) info.push({ name: "Body", value: input.body });

  return {
    message: input.draftId ? "Update email draft" : "Create email draft",
    image: "✉️",
    info,
  };
};

export default async function tool(input: Input): Promise<string> {
  assertWritable("draft-email");
  const parsed = validate(DraftEmailInput, input);

  const args: Record<string, unknown> = {};
  if (parsed.draftId) args.draft_id = parsed.draftId;
  if (parsed.type) args.type = parsed.type;
  if (parsed.threadId) args.thread_id = parsed.threadId;
  if (parsed.messageId) args.message_id = parsed.messageId;
  if (parsed.from) args.from = parsed.from;

  const to = splitList(parsed.recipient);
  if (to) args.to = to;
  const cc = splitList(parsed.cc);
  if (cc) args.cc = cc;
  const bcc = splitList(parsed.bcc);
  if (bcc) args.bcc = bcc;

  if (parsed.subject) args.subject = parsed.subject;
  if (parsed.instructions) args.instructions = parsed.instructions;
  if (parsed.body) args.body = flattenMarkdownLinks(parsed.body);

  const result = await callMcpTool<DraftResponse>("create_or_update_draft", args);
  const id = result?.draftId ?? result?.draft_id;
  const recipientLabel = to?.[0] ? ` for ${to.join(", ")}` : "";
  if (id) return `Draft ${parsed.draftId ? "updated" : "created"} (id: ${id})${recipientLabel}.`;
  return result?.message ?? `Draft ${parsed.draftId ? "updated" : "created"}${recipientLabel}.`;
}
