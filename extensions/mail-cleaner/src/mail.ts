import { runAppleScript } from "@raycast/utils";

export interface MailMessage {
  account: string;
  id: string;
  sender: string;
  subject: string;
  ageSeconds: number;
  read: boolean;
}

// Cuentas a revisar. Ajustá esta lista si agregás o quitás cuentas en Mail.app.
const ACCOUNTS = [
  "Google",
  "Datita Google",
  "iCloud",
  "Exchange",
  "TinaMKP Google",
];

// Cuántos correos recientes traer por cuenta (se combinan y se ordenan después).
const PER_ACCOUNT_LIMIT = 40;

function escapeAS(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function fetchRecentMessages(): Promise<MailMessage[]> {
  const accountsList = ACCOUNTS.map((a) => `"${escapeAS(a)}"`).join(", ");

  const script = `
on sanitize(_txt)
	set _newTxt to _txt
	set _saveTID to AppleScript's text item delimiters
	try
		set AppleScript's text item delimiters to {return, linefeed, tab}
		set _parts to text items of _newTxt
		set AppleScript's text item delimiters to " "
		set _newTxt to _parts as string
	end try
	set AppleScript's text item delimiters to _saveTID
	return _newTxt
end sanitize

set _accountsToCheck to {${accountsList}}
set _output to ""

tell application "Mail"
	repeat with _accName in _accountsToCheck
		try
			set _acc to account _accName
			set _inbox to first mailbox of _acc whose name is "INBOX"
			set _msgs to messages of _inbox
			set _count to count of _msgs
			set _upper to ${PER_ACCOUNT_LIMIT}
			if _count < _upper then set _upper to _count
			repeat with i from 1 to _upper
				set _msg to item i of _msgs
				set _subj to "(sin asunto)"
				try
					set _subj to my sanitize(subject of _msg)
				end try
				set _sender to ""
				try
					set _sender to my sanitize(sender of _msg)
				end try
				set _age to 0
				try
					set _age to ((current date) - (date received of _msg))
				end try
				set _isRead to true
				try
					set _isRead to read status of _msg
				end try
				set _mid to id of _msg
				set _output to _output & _accName & "\\t" & _mid & "\\t" & _sender & "\\t" & _subj & "\\t" & _age & "\\t" & _isRead & "\\n"
			end repeat
		end try
	end repeat
end tell

return _output
`;

  const raw = await runAppleScript(script);

  const messages: MailMessage[] = [];
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 6) continue;
    const [account, id, sender, subject, ageStr, readStr] = parts;
    messages.push({
      account,
      id,
      sender,
      subject,
      ageSeconds: parseFloat(ageStr) || 0,
      read: readStr.trim().toLowerCase() === "true",
    });
  }

  // Más reciente primero
  messages.sort((a, b) => a.ageSeconds - b.ageSeconds);

  return messages;
}

export interface DeleteTarget {
  account: string;
  id: string;
}

export interface DeleteResult {
  successCount: number;
  failedCount: number;
}

export async function moveMessagesToTrash(
  targets: DeleteTarget[],
): Promise<DeleteResult> {
  if (targets.length === 0) {
    return { successCount: 0, failedCount: 0 };
  }

  // Agrupamos por cuenta para resolver la papelera una sola vez por cuenta.
  const byAccount = new Map<string, string[]>();
  for (const t of targets) {
    const list = byAccount.get(t.account) ?? [];
    list.push(t.id);
    byAccount.set(t.account, list);
  }

  let scriptBody = "";
  for (const [account, ids] of byAccount.entries()) {
    const idsList = ids.map((id) => `"${escapeAS(id)}"`).join(", ");
    scriptBody += `
	try
		set _acc to account "${escapeAS(account)}"
		set _inbox to first mailbox of _acc whose name is "INBOX"
		try
			set _trash to (first mailbox of _acc whose name is "Papelera")
		on error
			set _trash to (first mailbox of _acc whose name is "Trash")
		end try
		set _ids to {${idsList}}
		repeat with _idStr in _ids
			set _targetId to _idStr as string
			try
				set _msg to (first message of _inbox whose id is (_targetId as integer))
				move _msg to _trash
				set _successCount to _successCount + 1
			on error
				set _failedCount to _failedCount + 1
			end try
		end repeat
	end try
`;
  }

  const script = `
set _successCount to 0
set _failedCount to 0

tell application "Mail"
${scriptBody}
end tell

return (_successCount as string) & "," & (_failedCount as string)
`;

  const result = await runAppleScript(script);
  const [successStr, failedStr] = result.split(",");

  return {
    successCount: parseInt(successStr, 10) || 0,
    failedCount: parseInt(failedStr, 10) || 0,
  };
}
