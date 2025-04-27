import { gmail_v1 } from "@googleapis/gmail";

export function getAddressParts(text: string | undefined | null):
  | {
      name: string | undefined;
      email: string | undefined;
    }
  | undefined {
  if (!text) {
    return undefined;
  }
  const mailStart = text.indexOf("<");
  const mailEnd = text.lastIndexOf(">");
  if (mailStart >= 0 && mailEnd >= 0 && mailEnd > mailStart) {
    let name = text
      .substring(0, mailStart - 1)
      .trim()
      .replaceAll('"', "");
    const email = text
      .substring(mailStart + 1, mailEnd)
      .trim()
      .replaceAll('"', "");
    if (!name || name.length <= 0) {
      name = email;
    }
    return { name, email };
  } else {
    if (text.includes("@")) {
      return { name: undefined, email: text.trim() };
    } else {
      return { name: text.trim(), email: undefined };
    }
  }
}

// Function to find and decode the plain text body
export function extractPlainTextBody(payload: gmail_v1.Schema$MessagePart | undefined): string | undefined {
  if (!payload) {
    return undefined;
  }

  // Recursive helper function
  function findPlainTextPart(part: gmail_v1.Schema$MessagePart): string | undefined {
    if (part.mimeType === "text/plain" && part.body?.data) {
      try {
        return Buffer.from(part.body.data, "base64").toString("utf8");
      } catch (e) {
        console.error("Failed to decode base64 body:", e);
        return undefined;
      }
    }

    // If it's a multipart message, search its parts
    if (part.mimeType?.startsWith("multipart/") && part.parts) {
      for (const subPart of part.parts) {
        const found = findPlainTextPart(subPart);
        if (found) {
          return found; // Return the first plain text part found
        }
      }
    }

    return undefined;
  }

  // Start search from the main payload or its parts
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    try {
      return Buffer.from(payload.body.data, "base64").toString("utf8");
    } catch (e) {
      console.error("Failed to decode base64 body:", e);
      return undefined;
    }
  } else if (payload.parts) {
    for (const part of payload.parts) {
      const found = findPlainTextPart(part);
      if (found) {
        return found;
      }
    }
  }

  return undefined; // No plain text part found
}

export function isMailUnread(message: gmail_v1.Schema$Message) {
  return message?.labelIds ? message.labelIds.includes("UNREAD") : false;
}

export function isMailDraft(message: gmail_v1.Schema$Message) {
  return message?.labelIds ? message.labelIds.includes("DRAFT") : false;
}

export function getMessageInternalDate(message: gmail_v1.Schema$Message) {
  return message.internalDate ? new Date(parseInt(message.internalDate)) : undefined;
}

export function getMessageAttachments(
  message: gmail_v1.Schema$Message,
): { filename: string; attachmentId: string; mimeType: string }[] {
  const attachments: { filename: string; attachmentId: string; mimeType: string }[] = [];
  const parts = message.payload?.parts;

  function findAttachments(parts: gmail_v1.Schema$MessagePart[] | undefined) {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          attachmentId: part.body.attachmentId,
          mimeType: part.mimeType || "application/octet-stream", // Default mime type
        });
      }
      // Recursively check nested parts (for multipart messages)
      if (part.parts) {
        findAttachments(part.parts);
      }
    }
  }

  findAttachments(parts);
  return attachments;
}

export function canMessageBeArchived(message: gmail_v1.Schema$Message) {
  if (!message.id) {
    return false;
  }
  return message?.labelIds ? message.labelIds.includes("INBOX") : false;
}
