import { Color, Icon, Image, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { OutgoingMessage } from "../types/types";
import emailRegex from "email-regex";

export enum OutgoingMessageAction {
  Compose = "Send Message",
  Reply = "Reply",
  ReplyAll = "Reply All",
  Forward = "Forward",
  Redirect = "Redirect",
}

export const OutgoingMessageIcons: { [key: string]: Image.ImageLike } = {
  [OutgoingMessageAction.Compose]: { source: "../assets/icons/sent.svg", tintColor: Color.PrimaryText },
  [OutgoingMessageAction.Reply]: Icon.Reply,
  [OutgoingMessageAction.ReplyAll]: Icon.Reply,
  [OutgoingMessageAction.Forward]: Icon.ArrowUpCircle,
  [OutgoingMessageAction.Redirect]: Icon.ArrowRightCircle,
};

export const newOutgoingMessage = async (
  message: OutgoingMessage,
  action = OutgoingMessageAction.Compose
): Promise<void> => {
  if (message.to.length === 0) {
    await showToast(Toast.Style.Failure, "No Recipients Specified");
    return;
  }
  console.log(message);
  for (const recipient of message.to) {
    if (!emailRegex({ exact: true }).test(recipient)) {
      await showToast(Toast.Style.Failure, "Invalid Email for Recipient");
      return;
    }
  }
  let attachments = message.attachments && message.attachments.length > 0 ? message.attachments : [];
  attachments = attachments.map((attachment: string) => `Macintosh HD${attachment.replaceAll("/", ":")}`);
  let actionScript = (() => {
    switch (action) {
      case OutgoingMessageAction.Compose:
        return "send";
      case OutgoingMessageAction.Reply:
        return "reply";
      case OutgoingMessageAction.ReplyAll:
        return "reply all";
      case OutgoingMessageAction.Forward:
        return "forward";
      case OutgoingMessageAction.Redirect:
        return "redirect";
      default:
        return "send";
    }
  })();
  const script = `
    tell application "Mail"
      set theTos to {"${message.to.join(`", "`)}"}
      set theCcs to {"${message.cc.join(`", "`)}"}
      set theBccs to {"${message.bcc.join(`", "`)}"}
      set theAttachments to {"${attachments.join(`", "`)}"}
      set attechmentDelay to 1
      $
      set newMessage to make new outgoing message with properties {sender: "${message.account}", subject: "${
    message.subject
  }", content: "${message.content}", visible: false}
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
            delay attechmentDelay
          end try
        end repeat
      end tell
      ${actionScript} newMessage
    end tell  
  `;
  await runAppleScript(script);
};
