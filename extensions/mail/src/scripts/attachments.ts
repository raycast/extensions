import { existsSync } from "fs";
import { homedir } from "os";
import { extname, join } from "path";
import { showToast, Toast, open, showInFinder, closeMainWindow, getPreferenceValues } from "@raycast/api";

import { tellMessage } from "./messages";
import { Mailbox, Attachment, Message } from "../types";
import { formatFileSize, getMIMEtype } from "../utils/finder";

const { saveDirectory } = getPreferenceValues<Preferences>();
let downloadDirectory = saveDirectory.replace("~", homedir());

if (!existsSync(downloadDirectory)) {
  downloadDirectory = `${homedir()}/Downloads`;
}

const attachmentsDirectory = downloadDirectory;

const escapeAppleScriptString = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const sanitizeAttachmentName = (name: string) => {
  const sanitized = [...name]
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return character === "/" || character === "\\" || character === ":" || codePoint < 32 || codePoint === 127
        ? "_"
        : character;
    })
    .join("")
    .trim();
  return sanitized && sanitized !== "." && sanitized !== ".." ? sanitized : "attachment";
};

const getUniqueAttachmentName = (name: string) => {
  const extension = extname(name);
  const baseName = extension ? name.slice(0, -extension.length) : name;
  let candidate = name;
  let suffix = 1;

  while (existsSync(join(attachmentsDirectory, candidate))) {
    candidate = `${baseName} (${suffix++})${extension}`;
  }

  return candidate;
};

export const getAttachmentSaveDirectory = () => attachmentsDirectory;

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

export const saveAttachment = async (
  message: Message,
  mailbox: Mailbox,
  attachment?: Attachment,
  name?: string,
  { silent = false }: { silent?: boolean } = {},
): Promise<string | undefined> => {
  let attachmentName: string;
  if (attachment) {
    attachmentName = attachment.name;
  } else {
    attachmentName = await tellMessage(message, mailbox, "tell msg to get name of first mail attachment");
    if (attachmentName === "missing value") {
      if (!silent) {
        await showToast(Toast.Style.Failure, "No attachments found");
      }
      return;
    }
  }

  if (name) {
    const extension = extname(attachmentName);
    if (extension && !name.toLowerCase().endsWith(extension.toLowerCase())) {
      name = `${name}${extension}`;
    }
  } else {
    name = attachmentName;
  }

  name = getUniqueAttachmentName(sanitizeAttachmentName(name));
  const attachmentPath = join(attachmentsDirectory, name);

  const script = `
    set targetFile to (POSIX file "${escapeAppleScriptString(attachmentPath)}")
    tell msg
      set selectedAttachment to (first mail attachment${attachment ? ` whose id is "${escapeAppleScriptString(attachment.id)}"` : ""})
      save selectedAttachment in targetFile
    end tell
  `;

  try {
    await tellMessage(message, mailbox, script);
    if (!silent) {
      const options: Toast.Options = {
        title: `Saved Attachment "${name}"`,
        style: Toast.Style.Success,
        primaryAction: {
          title: "Open Attachment",
          onAction: async (toast: Toast) => {
            await open(attachmentPath);
            await toast.hide();
            await closeMainWindow();
          },
        },
        secondaryAction: {
          title: "Show in Finder",
          onAction: async (toast: Toast) => {
            await showInFinder(attachmentPath);
            await toast.hide();
            await closeMainWindow();
          },
        },
      };
      await showToast(options);
    }
    return attachmentPath;
  } catch (error) {
    if (!silent) {
      await showToast(Toast.Style.Failure, "Error saving attachment");
    }
    console.error(error);
    throw error;
  }
};

export const saveAllAttachments = async (message: Message, mailbox: Mailbox) => {
  const script = `
    set destFolder to (POSIX file "${escapeAppleScriptString(attachmentsDirectory)}") as string
    tell msg 
      repeat with selectedAttachment in mail attachments
        set attachmentName to name of selectedAttachment
        set attachmentPath to destFolder & ":" & attachmentName
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
