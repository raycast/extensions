import { Tool, getPreferenceValues } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";

/**
 * Input parameters for the draft-email tool.
 * Use this ONLY for composing a new email or updating an existing draft, NOT for searching.
 * Always pass full email addresses for recipients, never just first names.
 * If body contains Markdown links, they are flattened to plain text URLs before sending to Superhuman.
 */
type Input = {
  /**
   * Existing draft id to update. Omit to create a new draft.
   */
  draftId?: string;
  /**
   * Comma-separated list of "To" email addresses (e.g. "alex@example.com, sam@example.com").
   */
  recipient?: string;
  /**
   * Comma-separated list of CC email addresses.
   */
  cc?: string;
  /**
   * Comma-separated list of BCC email addresses.
   */
  bcc?: string;
  /**
   * The subject line of the email.
   */
  subject?: string;
  /**
   * The body content of the email (plain text; Markdown links will be flattened).
   */
  body?: string;
};

interface DraftResponse {
  draftId?: string;
  draft_id?: string;
  url?: string;
  message?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { enableDraftPreviews } = getPreferenceValues<Preferences>();
  if (!enableDraftPreviews) return undefined;

  if (input.recipient && !input.recipient.includes("@")) {
    return {
      message: `⚠️ "${input.recipient}" does not look like an email address.\nProvide a full address (e.g., "name@example.com") before drafting.`,
      image: "⚠️",
    };
  }

  const info: { name: string; value: string }[] = [];
  if (input.recipient) info.push({ name: "To", value: input.recipient });
  if (input.cc) info.push({ name: "CC", value: input.cc });
  if (input.bcc) info.push({ name: "BCC", value: input.bcc });
  if (input.subject) info.push({ name: "Subject", value: input.subject });
  if (input.body) info.push({ name: "Body", value: input.body });

  return {
    message: input.draftId ? "Update email draft" : "Create email draft",
    image: "✉️",
    info,
  };
};

function flattenMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => `${label}: ${url}`);
}

function splitList(value?: string): string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export default async function tool(input: Input): Promise<string> {
  const body = input.body ? flattenMarkdownLinks(input.body) : undefined;

  const args: Record<string, unknown> = {};
  if (input.draftId) args.draft_id = input.draftId;
  const to = splitList(input.recipient);
  if (to) args.to = to;
  const cc = splitList(input.cc);
  if (cc) args.cc = cc;
  const bcc = splitList(input.bcc);
  if (bcc) args.bcc = bcc;
  if (input.subject) args.subject = input.subject;
  if (body) args.body = body;

  const result = await callMcpTool<DraftResponse>("create_or_update_draft", args);
  const id = result?.draftId ?? result?.draft_id;
  if (id)
    return `Draft ${input.draftId ? "updated" : "created"} (id: ${id})${input.recipient ? ` for ${input.recipient}` : ""}.`;
  return (
    result?.message ??
    `Draft ${input.draftId ? "updated" : "created"}${input.recipient ? ` for ${input.recipient}` : ""}.`
  );
}
