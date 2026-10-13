import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { simpleParser } from "mailparser";
import TurndownService from "turndown";
import juice from "juice";
import utf8 from "utf8";

import { Account, Mailbox, Message, OutgoingMessage, OutgoingMessageAction } from "../types";
import { constructDate, formatMarkdown, messageLimit, stripHtmlComments, titleCase } from "../utils";
import { Cache } from "../utils/cache";
import { getMailboxType, isArchiveMailbox, isJunkMailbox, isTrashMailbox } from "../utils/mailbox";
import { blockAnchors, hideElements } from "../utils/turndown";
import { Validation } from "../utils/validation";
import { getAccounts } from "./accounts";

// Override plainTextMode preference until HTML formatting issues in prod build are resolved
const plainTextMode = true;

type MoveMessageOptions = {
  silent?: boolean;
};

type MessageLookupOptions = {
  accountName?: string;
  mailboxName?: string;
};

type MessageLookupResult = {
  account: Account;
  mailbox: Mailbox;
  message: Message;
};

const escapeAppleScriptString = (value: string): string => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const validateMessageId = (messageId: string | number): string => {
  const id = String(messageId).trim();
  if (!/^\d+$/.test(id)) {
    throw new Error("Message ID must be numeric");
  }

  return id;
};

const updateMovedMessageCache = (message: Message, target: Mailbox) => {
  const account = Cache.getAccount(message.account);
  const mailboxes = account?.mailboxes || [];

  if (!account || !mailboxes.length) {
    return;
  }

  mailboxes.forEach((innerMailbox) => {
    if (innerMailbox.name === target.name) {
      Cache.addMessage(message, account.id, innerMailbox.name);
    } else {
      Cache.deleteMessage(message.id, account.id, innerMailbox.name);
    }
  });
};

export const getMessageById = async (
  messageId: string | number,
  { accountName = "", mailboxName = "" }: MessageLookupOptions = {},
): Promise<MessageLookupResult> => {
  const id = validateMessageId(messageId);
  const accountFilter = escapeAppleScriptString(accountName.trim());
  const mailboxFilter = escapeAppleScriptString(mailboxName.trim());
  const delimiter = "@@MAIL_FIELD_SPLIT_9e7c1a@@";

  const script = `
    set targetId to ${id}
    set delim to "${delimiter}"
    tell application "Mail"
      repeat with mailAccount in every account
        if "${accountFilter}" is "" or name of mailAccount is "${accountFilter}" then
          repeat with box in every mailbox of mailAccount
            if "${mailboxFilter}" is "" or name of box is "${mailboxFilter}" then
              try
                set msg to first message of box whose id is targetId
                set senderName to extract name from sender of msg
                set senderAddress to extract address from sender of msg
                set numAttachments to count of mail attachments of msg
                return (name of mailAccount) & delim & (name of box) & delim & (id of msg as string) & delim & (subject of msg) & delim & senderName & delim & senderAddress & delim & (date sent of msg) & delim & (read status of msg) & delim & numAttachments
              end try
            end if
          end repeat
        end if
      end repeat
    end tell

    return ""
  `;

  const output = await runAppleScript(script, { humanReadableOutput: true, timeout: 60000 });

  if (!output) {
    throw new Error(`Message ${id} was not found in Apple Mail`);
  }

  const [
    resolvedAccountName,
    resolvedMailboxName,
    resolvedMessageId,
    subject,
    senderName,
    senderAddress,
    date,
    read,
    numAttachments,
  ] = output.split(delimiter);

  const accounts = await getAccounts();
  const account = accounts?.find(
    (account) => account.name.trim().toLowerCase() === resolvedAccountName?.trim().toLowerCase(),
  );

  if (!account) {
    throw new Error(`Account "${resolvedAccountName}" was not found`);
  }

  const mailbox = account.mailboxes.find(
    (mailbox) => mailbox.name.trim().toLowerCase() === resolvedMailboxName?.trim().toLowerCase(),
  ) ?? {
    name: resolvedMailboxName,
    unreadCount: 0,
    type: getMailboxType(resolvedMailboxName),
  };

  return {
    account,
    mailbox,
    message: {
      id: resolvedMessageId,
      account: account.name,
      accountAddress: account.emails[0],
      subject,
      date: constructDate(date),
      read: read === "true",
      numAttachments: parseInt(numAttachments),
      senderName,
      senderAddress,
    },
  };
};

export const tellMessage = async (message: Message, mailbox: Mailbox, script: string): Promise<string> => {
  if (!script.includes("msg")) {
    console.error("Script must include msg");
    return "missing value";
  }

  const scriptContainer = `
    tell application "Mail"
      tell account "${escapeAppleScriptString(message.account)}"
        set msg to (first message of (first mailbox whose name is "${escapeAppleScriptString(mailbox.name)}") whose id is "${message.id}")
        ${script.trim()}
      end tell
    end tell
  `;

  return await runAppleScript(scriptContainer);
};

export const openMessage = async (message: Message, mailbox: Mailbox) => {
  await tellMessage(message, mailbox, "open msg\nactivate");
};

export const toggleMessageRead = async (
  message: Message,
  mailbox: Mailbox,
  { silent = false }: { silent?: boolean } = {},
) => {
  try {
    const account = Cache.getAccount(message.account);
    const mailboxes = account?.mailboxes || [];

    if (account && mailboxes) {
      mailboxes.forEach((innerMailbox) => {
        Cache.updateMessage(
          message.id,
          {
            ...message,
            read: !message.read,
          },
          account.id,
          innerMailbox.name,
        );
      });
    }

    if (!silent) {
      await showToast(Toast.Style.Success, `Message marked as ${message.read ? "unread" : "read"}`);
    }

    await tellMessage(message, mailbox, "tell msg to set read status to not read status");
  } catch (error) {
    if (!silent) {
      await showToast(Toast.Style.Failure, `Failed to mark message as ${message.read ? "unread" : "read"}`);
    }

    console.error(error);

    Cache.invalidateMessages();
  }
};

export const setMessageReadStatus = async (message: Message, mailbox: Mailbox, read: boolean) => {
  await tellMessage(message, mailbox, `tell msg to set read status to ${read}`);

  const account = Cache.getAccount(message.account);
  account?.mailboxes.forEach((innerMailbox) => {
    Cache.updateMessage(
      message.id,
      {
        ...message,
        read,
      },
      account.id,
      innerMailbox.name,
    );
  });
};

export const moveMessageTo = async (
  message: Message,
  mailbox: Mailbox,
  target: Mailbox,
  options: MoveMessageOptions = {},
) => {
  try {
    await tellMessage(
      message,
      mailbox,
      `set mailbox of msg to first mailbox whose name is "${escapeAppleScriptString(target.name)}"`,
    );
    updateMovedMessageCache(message, target);

    if (!options.silent) {
      await showToast(Toast.Style.Success, `Moved message to ${titleCase(target.name)}`);
    }
  } catch (error) {
    if (!options.silent) {
      await showToast(Toast.Style.Failure, `Error moving message to ${titleCase(target.name)}`);
    }
    console.error(error);

    Cache.invalidateMessages();
    throw error;
  }
};

export const moveMessageToArchive = async (
  message: Message,
  account: Account,
  mailbox: Mailbox,
  options: MoveMessageOptions = {},
) => {
  const archiveMailbox = account.mailboxes.find(isArchiveMailbox);
  if (!archiveMailbox) {
    if (!options.silent) {
      await showToast(Toast.Style.Failure, "No Archive mailbox found");
    }
    throw new Error("No Archive mailbox found");
  }

  await moveMessageTo(message, mailbox, archiveMailbox, options);
};

export const moveMessageToJunk = async (
  message: Message,
  account: Account,
  mailbox: Mailbox,
  options: MoveMessageOptions = {},
) => {
  const junkMailbox = account.mailboxes.find(isJunkMailbox);
  if (!junkMailbox) {
    if (!options.silent) {
      await showToast(Toast.Style.Failure, "No Junk mailbox found");
    }
    throw new Error("No Junk mailbox found");
  }

  await moveMessageTo(message, mailbox, junkMailbox, options);
};

export const moveMessageToTrash = async (
  message: Message,
  account: Account,
  mailbox: Mailbox,
  options: MoveMessageOptions = {},
) => {
  const trashMailbox = account.mailboxes.find(isTrashMailbox);
  if (!trashMailbox) {
    if (!options.silent) {
      await showToast(Toast.Style.Failure, "No Trash mailbox found");
    }
    throw new Error("No Trash mailbox found");
  }

  await moveMessageTo(message, mailbox, trashMailbox, options);
};

export const moveMessageToTrashById = async (
  messageId: string | number,
  options: MoveMessageOptions & MessageLookupOptions = {},
) => {
  const { account, mailbox, message } = await getMessageById(messageId, options);
  await moveMessageToTrash(message, account, mailbox, options);

  return { account, mailbox, message };
};

export const deleteMessage = async (message: Message, mailbox: Mailbox) => {
  try {
    const account = Cache.getAccount(message.account);
    const mailboxes = account?.mailboxes || [];

    if (account && mailboxes.length) {
      mailboxes.forEach((mailbox) => {
        Cache.deleteMessage(message.id, account.id, mailbox.name);
      });
    }

    await showToast(Toast.Style.Success, "Message deleted");
    await tellMessage(
      message,
      mailbox,
      `
        open msg
        activate
        delay 0.5
		    tell application "System Events" to key code 51
      `,
    );
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error deleting message");
    console.error(error);

    Cache.invalidateMessages();
  }
};

export const getRecipients = async (
  message: Message,
  mailbox: Mailbox,
  { strict = false }: { strict?: boolean } = {},
): Promise<string[]> => {
  const script = `
    set output to ""
    repeat with r in recipients of msg
      tell r to set output to output & name & "$break" & address & "$end"
    end repeat
  `;

  try {
    const output = await tellMessage(message, mailbox, script);
    if (strict && !output.trim()) {
      throw new Error("No recipient data returned");
    }

    const response: string[] = output.split("$end");
    response.pop();
    const recipientNames: string[] = [];
    const recipientAddresses: string[] = [];

    for (const line of response) {
      const [name, address] = line.split("$break");
      if (address !== message.accountAddress) {
        recipientNames.push(name);
        recipientAddresses.push(address);
      }
    }

    return [message.senderAddress, ...recipientAddresses];
  } catch (error) {
    console.error(error);
    if (strict) {
      throw new Error("Unable to resolve reply-all recipients", { cause: error });
    }
    return [message.senderAddress];
  }
};

export const getRecentMessagesContent = async () => {
  const script = `
  tell application "Mail"
    set currentDate to current date
    set fifteenMinutesAgo to currentDate - (15 * minutes)
    
    set msgs to {}
    set output to ""
    
    set allAccounts to every account
    
    repeat with i from 1 to count of allAccounts
      set currentAccount to item i of allAccounts
      
      set inboxMailbox to mailbox "INBOX" of currentAccount
      
      set inboxMessages to (messages of inboxMailbox whose date received > fifteenMinutesAgo)
      
      set msgs to msgs & inboxMessages
    end repeat
    
    set msgCount to count of msgs
    
    if msgCount is 0 then
      return ""
    else
      repeat with i from 1 to msgCount
        set messageContent to (date received of item i of msgs) & "|||DELIMITER|||" & content of item i of msgs
        set output to output & messageContent & "$end"
      end repeat
      return output
    end if
  end tell
  `;

  let data: string;
  try {
    data = await runAppleScript(script, {
      humanReadableOutput: true,
      timeout: 60000,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Command timed out")) {
      console.error("AppleScript Timed Out");
    } else {
      console.error("Error Running AppleScript");
    }
    return undefined;
  }

  const messages = data.split("$end").filter(Boolean);

  const sortedMessages = messages
    .map((msg) => {
      const [dateReceived, content] = msg.split("|||DELIMITER|||");
      return { dateReceived: constructDate(dateReceived), content };
    })
    .toSorted((a, b) => b.dateReceived.getTime() - a.dateReceived.getTime()) // most recent first
    .map((msg) => msg.content);

  return sortedMessages;
};

export const getMessages = async (
  account: Account,
  mailbox: Mailbox,
  unreadOnly = false,
  numMessages = messageLimit,
): Promise<Message[] | undefined> => {
  let messages = Cache.getMessages(account.id, mailbox.name);

  const first = messages.length > 0 ? messages[0].id : undefined;
  const script = `
    set output to ""
    tell application "Mail"
      set mailAccount to account "${account.name}"
      set box to first mailbox of mailAccount whose name is "${mailbox.name}"
      set messageCount to count of messages in box
      set msgs to {}
      repeat with i from 1 to ${numMessages}
        if i > messageCount then exit repeat
        set msg to message i of box
        ${first ? `if id of msg is ${first} then exit repeat` : ""}
        set senderName to extract name from sender of msg
        set senderAddress to extract address from sender of msg
        set numAttachments to count of mail attachments of msg
        set messageData to {id of msg, subject of msg, senderName, senderAddress, date sent of msg, read status of msg, numAttachments}
        set end of msgs to messageData
      end repeat
    end tell
    repeat with messageData in msgs
      set output to output & item 1 of messageData & "$break" & item 2 of messageData & "$break" & item 3 of messageData & "$break" & item 4 of messageData & "$break" & item 5 of messageData & "$break" & item 6 of messageData & "$break" & item 7 of messageData & "$end"
    end repeat
    return output
  `;

  let data: string;
  try {
    data = await runAppleScript(script, {
      humanReadableOutput: true,
      timeout: 60000,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Command timed out")) {
      console.error("AppleScript Timed Out");
    } else {
      console.error("Error Running AppleScript");
    }
    return undefined;
  }
  const response: string[] = data.split("$end");
  response.pop();

  const newMessages: Message[] = response.map((line: string) => {
    const [id, subject, senderName, senderAddress, date, read, numAttachments] = line.split("$break");
    return {
      id,
      account: account.name,
      accountAddress: account.emails[0],
      subject,
      date: constructDate(date),
      read: read === "true",
      numAttachments: parseInt(numAttachments),
      senderName,
      senderAddress,
    };
  });

  // Get messages after await as they might have changed
  messages = Cache.getMessages(account.id, mailbox.name);
  messages = newMessages.concat(messages);

  Cache.setMessages(messages, account.id, mailbox.name);

  const result = unreadOnly ? messages.filter((x) => !x.read) : messages;
  return result.slice(0, messageLimit);
};

export const getMessageContent = async (message: Message, mailbox: Mailbox) => {
  try {
    return await tellMessage(message, mailbox, "tell msg to return content");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error getting message content");
    console.error(error);
    return "";
  }
};

export const getNativeReplyRecipients = async (
  message: Message,
  mailbox: Mailbox,
  action: OutgoingMessageAction.Reply | OutgoingMessageAction.ReplyAll,
) => {
  const messageAccount = escapeAppleScriptString(message.account);
  const messageMailbox = escapeAppleScriptString(mailbox.name);
  const messageId = escapeAppleScriptString(String(message.id));
  const actionScript =
    action === OutgoingMessageAction.Reply ? "reply msg" : "reply msg with properties {reply to all: true}";
  const script = `
    tell application "Mail"
      tell account "${messageAccount}"
        set msg to (first message of (first mailbox whose name is "${messageMailbox}") whose id is "${messageId}")
      end tell
      set previewMessage to ${actionScript}
      try
        set visible of previewMessage to false
        set output to ""
        tell previewMessage
          repeat with theRecipient in to recipients
            set output to output & address of theRecipient & "$recipient$"
          end repeat
          set output to output & "$field$"
          repeat with theCc in cc recipients
            set output to output & address of theCc & "$recipient$"
          end repeat
          set output to output & "$field$"
          repeat with theBcc in bcc recipients
            set output to output & address of theBcc & "$recipient$"
          end repeat
        end tell
        close previewMessage saving no
      on error errorMessage number errorNumber
        try
          close previewMessage saving no
        end try
        error errorMessage number errorNumber
      end try
      return output
    end tell
  `;

  const output = await runAppleScript(script);
  const [to = "", cc = "", bcc = ""] = output.split("$field$");
  const parseAddresses = (addresses: string) => addresses.split("$recipient$").filter(Boolean);

  return { to: parseAddresses(to), cc: parseAddresses(cc), bcc: parseAddresses(bcc) };
};

export const getMessageHtml = async (message: Message, mailbox: Mailbox) => {
  try {
    const source = await tellMessage(message, mailbox, "tell msg to return source");
    const decodedSource = utf8.decode(source);

    const { html, textAsHtml } = await simpleParser(decodedSource, { encoding: "utf-8" });

    if (!html) return textAsHtml;

    const htmlWithoutComments = stripHtmlComments(html || "");
    const htmlWithInlineCss = juice(htmlWithoutComments, {
      preserveFontFaces: false,
      preserveImportant: false,
      preserveMediaQueries: false,
      preserveKeyFrames: false,
      preservePseudos: false,
      removeStyleTags: true,
    });

    return htmlWithInlineCss;
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error getting message html");
    console.error(error);
    return "";
  }
};

export const getMessageMarkdown = async (message: Message, mailbox: Mailbox): Promise<string> => {
  try {
    if (plainTextMode) {
      const content = await getMessageContent(message, mailbox);
      return formatMarkdown(message.subject, content);
    }

    const html = await getMessageHtml(message, mailbox);

    const turndownService = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      strongDelimiter: "**",
      emDelimiter: "_",
    });

    turndownService.use([hideElements, blockAnchors]);

    const markdown = turndownService.turndown(html ?? "");

    return formatMarkdown(message.subject, markdown);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error getting message markdown");
    console.error(error);
    return "";
  }
};

export const sendMessage = async (
  outgoingMessage: OutgoingMessage,
  action = OutgoingMessageAction.New,
  message?: Message,
  mailbox?: Mailbox,
  { preserveNativeReplyRecipients = false }: { preserveNativeReplyRecipients?: boolean } = {},
) => {
  const keepNativeReplyRecipients =
    preserveNativeReplyRecipients &&
    (action === OutgoingMessageAction.Reply || action === OutgoingMessageAction.ReplyAll);

  if (outgoingMessage.to.length === 0 && !keepNativeReplyRecipients) {
    await showToast(Toast.Style.Failure, "No recipients specified");
    throw new Error("No recipients specified");
  }

  for (const recipient of outgoingMessage.to) {
    if (Validation.email(recipient)) {
      await showToast(Toast.Style.Failure, "Invalid email for recipient");
      throw new Error(`Invalid email for recipient: ${recipient}`);
    }
  }

  let attachments =
    outgoingMessage.attachments && outgoingMessage.attachments.length > 0 ? outgoingMessage.attachments : [];
  attachments = attachments.map(escapeAppleScriptString);

  const messageAccount = message ? escapeAppleScriptString(message.account) : "";
  const messageMailbox = mailbox ? escapeAppleScriptString(mailbox.name) : "";
  const recipients = {
    to: outgoingMessage.to.map(escapeAppleScriptString),
    cc: outgoingMessage.cc.map(escapeAppleScriptString),
    bcc: outgoingMessage.bcc.map(escapeAppleScriptString),
  };
  const toAppleScriptList = (values: string[]) => (values.length > 0 ? `{"${values.join(`", "`)}"}` : "{}");
  const toList = toAppleScriptList(recipients.to);
  const ccList = toAppleScriptList(recipients.cc);
  const bccList = toAppleScriptList(recipients.bcc);
  const attachmentList = toAppleScriptList(attachments);
  const sender = escapeAppleScriptString(outgoingMessage.from);
  const subject = escapeAppleScriptString(outgoingMessage.subject);
  const content = escapeAppleScriptString(outgoingMessage.content);
  const messageId = message ? escapeAppleScriptString(String(message.id)) : "";

  const isReplyOrForward =
    action === OutgoingMessageAction.Reply ||
    action === OutgoingMessageAction.ReplyAll ||
    action === OutgoingMessageAction.Forward;

  const actionScript = (() => {
    switch (action) {
      case OutgoingMessageAction.New:
        return "make new outgoing message";
      case OutgoingMessageAction.Reply:
        return "reply msg";
      case OutgoingMessageAction.ReplyAll:
        return "reply msg with properties {reply to all: true}";
      case OutgoingMessageAction.Forward:
        return "forward msg";
      case OutgoingMessageAction.Redirect:
        return "redirect msg";
      default:
        return "make new outgoing message";
    }
  })();

  const script = `
    tell application "Mail"
      ${
        message && mailbox
          ? `tell account "${messageAccount}"
          set msg to (first message of (first mailbox whose name is "${messageMailbox}") whose id is "${messageId}")
        end tell`
          : ""
      }
      set theTos to ${toList}
      set theCcs to ${ccList}
      set theBccs to ${bccList}
      set theAttachments to ${attachmentList}
      set newMessage to ${actionScript}
      set senderValue to "${sender}"
      ${
        isReplyOrForward
          ? `
      set sender of newMessage to senderValue
      if "${subject}" is not "" then
        set subject of newMessage to "${subject}"
      end if
      set existingContent to (content of newMessage as string)
      set content of newMessage to "${content}" & return & return & existingContent
      `
          : `
      set properties of newMessage to {sender: senderValue, subject: "${subject}", content: "${content}", visible: false}
      `
      }
      tell newMessage
        ${
          action === OutgoingMessageAction.Forward
            ? `
        delete every recipient
        delete every cc recipient
        delete every bcc recipient
        `
            : isReplyOrForward && !keepNativeReplyRecipients
              ? `
        delete every recipient
        `
              : ""
        }
        repeat with theTo in theTos
          make new recipient at end of to recipients with properties {address:theTo}
        end repeat
        repeat with theCc in theCcs
          make new cc recipient at end of cc recipients with properties {address:theCc}
        end repeat
        repeat with theBcc in theBccs
          make new bcc recipient at end of bcc recipients with properties {address:theBcc}
        end repeat
        repeat with theAttachment in theAttachments
          try
            set attachFile to (POSIX file theAttachment) as alias
            make new attachment with properties {file name:attachFile} at after last paragraph
            delay 1
          end try
        end repeat
      end tell
      send newMessage
    end tell  
  `;

  await runAppleScript(script);
};
