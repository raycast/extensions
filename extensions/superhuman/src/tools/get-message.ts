import { callMcpTool } from "../lib/mcp";
import { GetMessageInput, validate } from "../lib/validation";

/**
 * Fetch a single email message. Set `includeRawHtml` when the AI needs to
 * inspect formatting or extract embedded resources.
 */
type Input = {
  /** The id of the message to fetch. */
  messageId: string;
  /** Include the raw HTML body alongside the plain-text rendering. */
  includeRawHtml?: boolean;
};

export default async function tool(input: Input): Promise<unknown> {
  const parsed = validate(GetMessageInput, input);
  const args: Record<string, unknown> = { message_id: parsed.messageId };
  if (parsed.includeRawHtml !== undefined) args.include_raw_html = parsed.includeRawHtml;
  return callMcpTool("get_message", args);
}
