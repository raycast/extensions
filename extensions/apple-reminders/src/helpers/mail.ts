import { runAppleScript } from "@raycast/utils";

export type SelectedEmail = {
  subject: string;
  url: string;
  sender: string;
  messageId: string;
};

export const MAIL_DELIMITER = "---RAYCAST_MAIL_SEPARATOR---";

export const GET_SELECTED_EMAIL_SCRIPT = `
tell application "System Events"
  set isRunning to (name of processes) contains "Mail"
end tell
if isRunning then
  tell application "Mail"
    set selectedMessages to selection
    if (count of selectedMessages) > 0 then
      set theMsg to item 1 of selectedMessages
      set msgSubject to subject of theMsg
      set msgId to message id of theMsg
      set msgSender to sender of theMsg
      return msgSubject & "${MAIL_DELIMITER}" & msgId & "${MAIL_DELIMITER}" & msgSender
    else
      return "NO_SELECTION"
    end if
  end tell
else
  return "MAIL_NOT_RUNNING"
end if
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
  if (!rawResult || rawResult === "MAIL_NOT_RUNNING" || rawResult === "NO_SELECTION") {
    return null;
  }

  const parts = rawResult.split(MAIL_DELIMITER);
  if (parts.length < 2) {
    return null;
  }

  const subject = parts[0]?.trim() || "";
  const rawMessageId = parts[1]?.trim() || "";
  const sender = parts[2]?.trim() || "";

  if (!rawMessageId) {
    return null;
  }

  const cleanId = rawMessageId.replace(/^<+|>+$/g, "");
  const url = `message://%3C${cleanId}%3E`;

  return {
    subject,
    url,
    sender,
    messageId: cleanId,
  };
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
