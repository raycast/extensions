import { existsSync } from "fs";
import { homedir } from "os";
import { showToast, Toast, open, showInFinder, closeMainWindow, getPreferenceValues } from "@raycast/api";

import { tellMessage } from "./messages";
import { Mailbox, Attachment, Message } from "../types";
import { formatFileSize, getMIMEtype } from "../utils/finder";

const { saveDirectory } = getPreferenceValues<Preferences>();
let downloadDirectory = saveDirectory.replace("~", homedir());
const attachmentsDirectory = downloadDirectory;

if (!existsSync(downloadDirectory)) {
  downloadDirectory = `${homedir()}/Downloads`;
}

downloadDirectory = "Macintosh HD" + downloadDirectory.replaceAll("/", ":");

export const getAttachments = async (message: Message, mailbox: Mailbox): Promise<Attachment[]> => {
  try {
    const script = `
      set output to ""
      tell msg 
        repeat with a in mail attachments
          tell a 
            set output to output & id & "$break" & name & "$break" & file size & "$end"
          end tell
        end repeat
      end tell
    `;

    const response: string[] = (await tellMessage(message, mailbox, script)).split("$end");
    response.pop();

    const attachments: Attachment[] = response.map((line: string) => {
      const [id, name, size] = line.split("$break");
      const type = getMIMEtype(name.split(".").pop());
      return { id, name, type, size: formatFileSize(parseInt(size)) };
    });

    return attachments;
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error getting message attachments");
    console.error(error);
    return [];
  }
};

export const saveAttachment = async (message: Message, mailbox: Mailbox, attachment?: Attachment, name?: string) => {
  let attachmentName: string;
  if (attachment) {
    attachmentName = attachment.name;
  } else {
    attachmentName = await tellMessage(message, mailbox, "tell msg to get name of first mail attachment");
    if (attachmentName === "missing value") {
      await showToast(Toast.Style.Failure, "No attachments found");
      return;
    }
  }

  if (name) {
    const extension = attachmentName.split(".").pop();
    if (extension && !name.endsWith(extension)) {
      name = `${name}.${extension}`;
    }
  } else {
    name = attachmentName;
  }

  const script = `
    set attachmentsFolder to "${downloadDirectory}"
    tell msg
      set selectedAttachment to (first mail attachment${attachment ? ` whose id is "${attachment.id}"` : ""})
      set attachmentName to "${name}"
      set attachmentPath to attachmentsFolder & ":" & attachmentName
      save selectedAttachment in attachmentPath
    end tell
  `;

  try {
    await tellMessage(message, mailbox, script);
    const options: Toast.Options = {
      title: `Saved Attachment "${name}"`,
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
    await showToast(Toast.Style.Failure, "Error saving attachment");
    console.error(error);
  }
};

export const saveAllAttachments = async (message: Message, mailbox: Mailbox) => {
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
    await showToast(Toast.Style.Failure, "Error saving attachments");
    console.error(error);
  }
};
