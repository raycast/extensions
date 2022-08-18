import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { OutgoingMessage } from "../types/types";
import emailRegex from "email-regex";
import { homedir } from "os";
import fs from "fs"; 

export const newOutgoingMessage = async (message: OutgoingMessage, action = "send"): Promise<void> => {
  if (message.recipeints.length === 0) {
    showToast(Toast.Style.Failure, "No Recipients");
    return; 
  }
  for (const recipient of message.recipeints) {
    if (!emailRegex({ exact: true }).test(recipient)) {
      showToast(Toast.Style.Failure, "Invalid Email for Recipient");
      return;
    }
  }
  for (let attachment of message.attachments) {
    attachment = attachment.replace("~", homedir()); 
    if (!fs.existsSync(attachment)) {
      showToast(Toast.Style.Failure, "Attachment Not Found");
      return;
    }
  }
  const script = `
    tell application "Mail"
      set theTos to {"${message.recipeints.join(`", "`)}"}
      set theCcs to {"${message.ccs.join(`", "`)}"}
      set theBccs to {"${message.bccs.join(`", "`)}"}
      set theAttachments to {"${message.attachments.join(`", "`)}"}
      set attechmentDelay to 1
      set newMessage to make new outgoing message with properties {sender:${message.account}, subject:${message.subject}, content:${message.content}, visible:false}
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
          make new attachment with properties {file name:theAttachment as alias} at after last paragraph
          delay attechmentDelay
        end repeat
      end tell
      ${action} newMessage
    end tell  
  `;
  await runAppleScript(script);
};
