/**
 * Narrow response shapes for the Superhuman MCP tools. The MCP returns
 * snake_case in JSON-RPC results; the wrappers normalize to camelCase before
 * returning so the AI surface sees a consistent shape.
 */

export interface DraftResponse {
  draftId?: string;
  draft_id?: string;
  url?: string;
  message?: string;
}

export interface SendResponse {
  ok?: boolean;
  messageId?: string;
  message_id?: string;
  undoToken?: string;
  undo_token?: string;
  undoExpiresAt?: string;
  undo_expires_at?: string;
  message?: string;
}

export interface AttachmentResponse {
  contentType?: string;
  content_type?: string;
  data?: string;
  url?: string;
  downloadUrl?: string;
  download_url?: string;
  expiresAt?: string;
  expires_at?: string;
  filename?: string;
}
