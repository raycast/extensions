import { callMcpTool } from "../lib/mcp";

/**
 * Retrieve metadata and/or content for an attachment on a Superhuman message.
 * Returns whatever the server provides (download URL, base64 data, or metadata only).
 */
type Input = {
  /**
   * The id of the message containing the attachment.
   */
  messageId: string;
  /**
   * The id of the attachment to fetch.
   */
  attachmentId: string;
};

export default async function tool(input: Input): Promise<unknown> {
  return callMcpTool("get_attachment", {
    message_id: input.messageId,
    attachment_id: input.attachmentId,
  });
}
