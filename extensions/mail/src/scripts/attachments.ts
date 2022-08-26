import { showToast, Toast, open, showInFinder, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { Preferences, Attachment, Message } from "../types/types";
import { tellMessage } from "./messages";
import { formatFileSize, getMIMEtype } from "../utils/file-utils";
import { existsSync } from "fs";
import { homedir } from "os";

const preferences: Preferences = getPreferenceValues();
let downloadDirectory = preferences.saveDirectory.replace("~", homedir());
const attachmentsDirectory = downloadDirectory;
if (!existsSync(downloadDirectory)) {
  downloadDirectory = `${homedir()}/Downloads`;
}
downloadDirectory = "Macintosh HD" + downloadDirectory.replaceAll("/", ":");

export const getMessageAttachments = async (message: Message, mailbox: string): Promise<Attachment[]> => {
  try {
    const script = `
      set output to ""
      tell application "Mail"
        set acc to (first account whose id is "${message.account}")
        tell acc
          set msg to (first message of (first mailbox whose name is "${mailbox}") whose id is "${message.id}")
          tell msg 
            repeat with a in mail attachments
              tell a 
                set output to output & id & "$break" & name & "$break" & file size & "$end"
              end tell
            end repeat
          end tell
        end tell
      end tell
      return output
    `;
    const response: string[] = (await runAppleScript(script)).split("$end");
    response.pop();
    const attachments: Attachment[] = response.map((line: string) => {
      const [id, name, size] = line.split("$break");
      const type = getMIMEtype(name.split(".").pop());
      return { id, name, type, size: formatFileSize(size) };
    });
    return attachments;
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error Getting Message Attachments");
    console.error(error);
    return [];
  }
};

export const saveAttachment = async (message: Message, mailbox: string, attachment: Attachment, name?: string) => {
  if (name) {
    const extension = attachment.name.split(".").pop();
    if (extension && !name.endsWith(extension)) {
      name = name + "." + extension;
    }
  } else {
    name = attachment.name;
  }
  const script = `
    set attachmentsFolder to "${downloadDirectory}"
    tell msg
      set selectedAttachment to (first mail attachment whose id is "${attachment.id}")
      set attachmentName to "${name}"
      set attachmentPath to attachmentsFolder & ":" & attachmentName
      save selectedAttachment in attachmentPath
    end tell
  `;
  try {
    await tellMessage(message, mailbox, script);
    const options: Toast.Options = {
      title: `Saved Attachment ${name}`,
      style: Toast.Style.Success,
      primaryAction: {
        title: "Open Attachment",
        onAction: async (toast: Toast) => {
          await open(`${attachmentsDirectory}/${name}`);
          await toast.hide();
          await closeMainWindow();
        },
      },
      secondaryAction: {
        title: "Show in Finder",
        onAction: async (toast: Toast) => {
          await showInFinder(`${attachmentsDirectory}/${name}`);
          await toast.hide();
          await closeMainWindow();
        },
      },
    };
    await showToast(options);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error Saving Attachment");
    console.error(error);
  }
};

export const saveAllAttachments = async (message: Message, mailbox: string) => {
  const script = `
    set attachmentsFolder to "${downloadDirectory}"
    tell msg 
      repeat with selectedAttachment in mail attachments
        set attachmentName to name of selectedAttachment
        set attachmentPath to attachmentsFolder & ":" & attachmentName
        save selectedAttachment in attachmentPath
      end repeat
    end tell
  `;
  try {
    await tellMessage(message, mailbox, script);
    const options: Toast.Options = {
      title: "Saved Attachments",
      style: Toast.Style.Success,
      primaryAction: {
        title: "Show in Finder",
        onAction: async (toast: Toast) => {
          await open(attachmentsDirectory);
          await toast.hide();
          await closeMainWindow();
        },
      },
    };
    await showToast(options);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error Saving Attachments");
    console.error(error);
  }
};
