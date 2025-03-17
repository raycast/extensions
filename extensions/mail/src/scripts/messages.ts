import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { simpleParser } from "mailparser";
import TurndownService from "turndown";
import juice from "juice";
import utf8 from "utf8";

import { Account, Mailbox, Message, OutgoingMessage, OutgoingMessageAction } from "../types";
import { constructDate, formatMarkdown, messageLimit, stripHtmlComments, titleCase } from "../utils";
import { Cache } from "../utils/cache";
import { isArchiveMailbox, isJunkMailbox, isTrashMailbox } from "../utils/mailbox";
import { blockAnchors, hideElements } from "../utils/turndown";
import { Validation } from "../utils/validation";

// Override plainTextMode preference until HTML formatting issues in prod build are resolved
const plainTextMode = true;

export const tellMessage = async (message: Message, mailbox: Mailbox, script: string): Promise<string> => {
  if (!script.includes("msg")) {
    console.error("Script must include msg");
    return "missing value";
  }

  const scriptContainer = `
    tell application "Mail"
      tell account "${message.account}"
        set msg to (first message of (first mailbox whose name is "${mailbox.name}") whose id is "${message.id}")
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

export const moveMessageTo = async (message: Message, mailbox: Mailbox, target: Mailbox) => {
  try {
    const account = Cache.getAccount(message.account);
    const mailboxes = account?.mailboxes || [];

    if (account && mailboxes) {
      mailboxes.forEach((innerMailbox) => {
        if (innerMailbox.name === target.name) {
          Cache.addMessage(message, account.id, innerMailbox.name);
        } else {
          Cache.deleteMessage(message.id, account.id, innerMailbox.name);
        }
      });
    }

    await showToast(Toast.Style.Success, `Moved message to ${titleCase(target.name)}`);
    await tellMessage(message, mailbox, `set mailbox of msg to first mailbox whose name is "${target.name}"`);
  } catch (error) {
    await showToast(Toast.Style.Failure, `Error moving message to ${titleCase(target.name)}`);
    console.error(error);

    Cache.invalidateMessages();
  }
};

export const moveMessageToArchive = async (message: Message, account: Account, mailbox: Mailbox) => {
  try {
    const archiveMailbox = account.mailboxes.find(isArchiveMailbox);
    if (archiveMailbox) {
      const account = Cache.getAccount(message.account);
      const mailboxes = account?.mailboxes || [];

      if (account && mailboxes) {
        mailboxes.forEach((innerMailbox) => {
          if (innerMailbox.name === archiveMailbox.name) {
            Cache.addMessage(message, account.id, innerMailbox.name);
          } else {
            Cache.deleteMessage(message.id, account.id, innerMailbox.name);
          }
        });
      }

      await showToast(Toast.Style.Success, "Moved message to Archive");
      await tellMessage(message, mailbox, `move msg to mailbox "Archive"`);
    } else {
      await showToast(Toast.Style.Failure, "No Archive mailbox found");
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error moving message to Archive");
    console.error(error);

    Cache.invalidateMessages();
  }
};

export const moveMessageToJunk = async (message: Message, account: Account, mailbox: Mailbox) => {
  try {
    const junkMailbox = account.mailboxes.find(isJunkMailbox);
    if (junkMailbox) {
      const account = Cache.getAccount(message.account);
      const mailboxes = account?.mailboxes || [];

      if (account && mailboxes) {
        mailboxes.forEach((innerMailbox) => {
          if (innerMailbox.name === junkMailbox.name) {
            Cache.addMessage(message, account.id, innerMailbox.name);
          } else {
            Cache.deleteMessage(message.id, account.id, innerMailbox.name);
          }
        });
      }

      await showToast(Toast.Style.Success, "Moved message to Junk");
      await moveMessageTo(message, mailbox, junkMailbox);
    } else {
      await showToast(Toast.Style.Failure, "No Junk mailbox found");
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error moving message to Junk");
    console.error(error);

    Cache.invalidateMessages();
  }
};

export const moveMessageToTrash = async (message: Message, account: Account, mailbox: Mailbox) => {
  try {
    const trashMailbox = account.mailboxes.find(isTrashMailbox);
    if (trashMailbox) {
      const account = Cache.getAccount(message.account);
      const mailboxes = account?.mailboxes || [];

      if (account && mailboxes) {
        mailboxes.forEach((innerMailbox) => {
          if (innerMailbox.name === trashMailbox.name) {
            Cache.addMessage(message, account.id, innerMailbox.name);
          } else {
            Cache.deleteMessage(message.id, account.id, innerMailbox.name);
          }
        });
      }

      await showToast(Toast.Style.Success, "Moved message to Trash");
      await moveMessageTo(message, mailbox, trashMailbox);
    } else {
      await showToast(Toast.Style.Failure, "No Trash mailbox found");
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error moving message to Trash");
    console.error(error);

    Cache.invalidateMessages();
  }
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

export const getRecipients = async (message: Message, mailbox: Mailbox): Promise<string[]> => {
  const script = `
    set output to ""
    repeat with r in recipients of msg
      tell r to set output to output & name & "$break" & address & "$end"
    end repeat
  `;

  try {
    const response: string[] = (await tellMessage(message, mailbox, script)).split("$end");
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
    return [message.senderAddress];
  }
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
      accountAddress: account.email,
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
) => {
  if (outgoingMessage.to.length === 0) {
    await showToast(Toast.Style.Failure, "No recipients specified");
    return;
  }

  for (const recipient of outgoingMessage.to) {
    if (Validation.email(recipient)) {
      await showToast(Toast.Style.Failure, "Invalid email for recipient");
      return;
    }
  }

  let attachments =
    outgoingMessage.attachments && outgoingMessage.attachments.length > 0 ? outgoingMessage.attachments : [];
  attachments = attachments.map((attachment: string) => `Macintosh HD${attachment.replaceAll("/", ":")}`);

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
          ? `tell account "${message.account}"
          set msg to (first message of (first mailbox whose name is "${mailbox.name}") whose id is "${message.id}")
        end tell`
          : ""
      }
      set theTos to {"${outgoingMessage.to.join(`", "`)}"}
      set theCcs to {"${outgoingMessage.cc.join(`", "`)}"}
      set theBccs to {"${outgoingMessage.bcc.join(`", "`)}"}
      set theAttachments to {"${attachments.join(`", "`)}"}
      set newMessage to ${actionScript}
      set properties of newMessage to {sender: "${outgoingMessage.account}", subject: "${
        outgoingMessage.subject
      }", content: "${outgoingMessage.content}", visible: false}
      tell newMessage
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
            make new attachment with properties {file name:theAttachment as alias} at after last paragraph
            delay 1
          end try
        end repeat
      end tell
      send newMessage
    end tell  
  `;

  await runAppleScript(script);
};
