import { Icon, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { OutgoingMessage } from "../types/types";
import emailRegex from "email-regex";
import { homedir } from "os";
import fs from "fs";

export enum OutgoingMessageAction {
  Compose = "Send Message", 
  Reply = "Reply",
  ReplyAll = "Reply All",
  Forward = "Forward",
  Redirect = "Redirect",
};

export const OutgoingMessageIcons: { [key: string]: Icon | string } = {
  [OutgoingMessageAction.Compose]: "../assets/icons/send.svg",
  [OutgoingMessageAction.Reply]: Icon.Reply,
  [OutgoingMessageAction.ReplyAll]: Icon.Reply,
  [OutgoingMessageAction.Forward]: Icon.ArrowUpCircle,
  [OutgoingMessageAction.Redirect]: Icon.ArrowRightCircle,
};

export const newOutgoingMessage = async (message: OutgoingMessage, action?: OutgoingMessageAction ): Promise<void> => {
  if (message.to.length === 0) {
    await showToast(Toast.Style.Failure, "No Recipients");
    return;
  }
  for (const recipient of message.to) {
    if (!emailRegex({ exact: true }).test(recipient)) {
      await showToast(Toast.Style.Failure, "Invalid Email for Recipient");
      return;
    }
  }
  let attachments = message.attachments && message.attachments.length > 0 ? message.attachments : [];
  attachments = attachments
    .filter((attachment: string) => attachment.includes(homedir()) && fs.existsSync(attachment))
    .map((attachment: string) => `Macintosh HD${attachment.replaceAll("/", ":")}`);
  const script = `
    tell application "Mail"
      set theTos to {"${message.to.join(`", "`)}"}
      set theCcs to {"${message.cc.join(`", "`)}"}
      set theBccs to {"${message.bcc.join(`", "`)}"}
      set theAttachments to {"${attachments.join(`", "`)}"}
      set attechmentDelay to 1
      set newMessage to make new outgoing message with properties {sender:"${message.account}", subject:"${
    message.subject
  }", content:"${message.content}", visible:false}
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
      ${action} newMessage
    end tell  
  `;
  await runAppleScript(script);
};
