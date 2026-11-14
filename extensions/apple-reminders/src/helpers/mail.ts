import { runAppleScript } from "@raycast/utils";

export type SelectedEmail = {
  subject: string;
  url: string;
  sender: string;
  messageId: string;
};

export const GET_SELECTED_EMAIL_SCRIPT = `
run script "
(() => {
  const systemEvents = Application('System Events');
  const isRunning = systemEvents.processes.whose({ name: 'Mail' }).length > 0;
  if (!isRunning) return JSON.stringify({ status: 'MAIL_NOT_RUNNING' });
  const mail = Application('Mail');
  const selection = mail.selection();
  if (!selection || selection.length === 0) return JSON.stringify({ status: 'NO_SELECTION' });
  const msg = selection[0];
  return JSON.stringify({
    status: 'OK',
    subject: msg.subject() || '',
    messageId: msg.messageId() || '',
    sender: msg.sender() || ''
  });
})()
" in "JavaScript"
`;

export async function getSelectedEmail(): Promise<SelectedEmail | null> {
  try {
    const rawResult = await runAppleScript(GET_SELECTED_EMAIL_SCRIPT);
    return parseSelectedEmailResult(rawResult);
  } catch {
    return null;
  }
}

export function parseSelectedEmailResult(rawResult: string | undefined): SelectedEmail | null {
  if (!rawResult) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawResult.trim());
    if (parsed.status !== "OK" || !parsed.messageId) {
      return null;
    }

    const cleanId = String(parsed.messageId)
      .trim()
      .replace(/^<+|>+$/g, "");
    if (!cleanId) {
      return null;
    }

    const escapedId = cleanId.replace(/%/g, "%25");

    return {
      subject: String(parsed.subject ?? "").trim(),
      messageId: cleanId,
      sender: String(parsed.sender ?? "").trim(),
      url: `message://%3C${escapedId}%3E`,
    };
  } catch {
    return null;
  }
}

export function getSenderDisplayName(sender?: string): string {
  if (!sender) {
    return "";
  }
  const trimmed = sender.trim();
  const match = trimmed.match(/^([^<]+?)\s*<[^>]+>$/);
  if (match && match[1]?.trim()) {
    return match[1].trim().replace(/^["']|["']$/g, "");
  }
  const emailOnlyMatch = trimmed.match(/^<([^>]+)>$/);
  if (emailOnlyMatch && emailOnlyMatch[1]?.trim()) {
    return emailOnlyMatch[1].trim();
  }
  return trimmed;
}
