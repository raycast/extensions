import { callMcpTool } from "../lib/mcp";
import { AttachmentResponse } from "../lib/responses";
import { GetAttachmentInput, validate } from "../lib/validation";

/**
 * Retrieve a message attachment.
 *
 * Images and audio are returned inline as base64 data so the AI can act on
 * them directly. Other types return a download URL that expires within one
 * hour — `expiresAt` is surfaced in the response.
 */
type Input = {
  /** The id of the message containing the attachment. */
  messageId: string;
  /**
   * The filename of the attachment to fetch. Omit to fetch the first
   * attachment on the message.
   */
  attachmentName?: string;
  /** Deprecated: legacy id-based selector, kept for backward compatibility. */
  attachmentId?: string;
};

export default async function tool(input: Input): Promise<AttachmentResponse | unknown> {
  const parsed = validate(GetAttachmentInput, input);
  const args: Record<string, unknown> = { message_id: parsed.messageId };
  if (parsed.attachmentName) args.attachment_name = parsed.attachmentName;
  else if (parsed.attachmentId) args.attachment_id = parsed.attachmentId;
  return callMcpTool<AttachmentResponse>("get_attachment", args);
}
