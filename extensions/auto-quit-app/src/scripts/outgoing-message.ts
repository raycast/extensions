import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import emailRegex from "email-regex";
import { Mailbox, Message, OutgoingMessage, OutgoingMessageAction } from "../types";

export const newOutgoingMessage = async (
  outgoingMessage: OutgoingMessage,
  action = OutgoingMessageAction.New,
  message?: Message,
  mailbox?: Mailbox
) => {
  if (outgoingMessage.to.length === 0) {
    await showToast(Toast.Style.Failure, "No recipients specified");
    return;
  }

  for (const recipient of outgoingMessage.to) {
    if (!emailRegex({ exact: true }).test(recipient)) {
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
