import { Tool } from "@raycast/api";
import { uploadAttachment } from "../services/freeagent";
import { provider } from "../oauth";
import { AttachmentUploadData } from "../types";

function isValidBase64(data: string): boolean {
  // Strip optional data: URL prefix and surrounding whitespace
  const trimmed = data.replace(/^data:[^;]+;base64,/, "").trim();
  if (trimmed.length === 0 || trimmed.length % 4 !== 0) return false;
  // Allowed chars: A-Z a-z 0-9 + / =, with = padding only at the end (max 2)
  return /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed);
}

type Input = {
  /**
   * The name of the file being uploaded (e.g., "receipt.pdf", "invoice.jpg")
   */
  fileName: string;
  /**
   * The MIME type of the file (e.g., "image/jpeg", "application/pdf", "image/png")
   */
  contentType: string;
  /**
   * Base64 encoded file content. Use btoa() in JavaScript or base64 encoding in other languages.
   */
  fileData: string;
  /**
   * Optional description of the attachment (e.g., "Receipt for office supplies", "Invoice from supplier")
   */
  description?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Upload "${input.fileName}" to FreeAgent?`,
  info: [
    { name: "File Name", value: input.fileName },
    { name: "Content Type", value: input.contentType },
    ...(input.description ? [{ name: "Description", value: input.description }] : []),
  ],
});

/**
 * Upload a file attachment to FreeAgent that can be associated with bank transaction explanations.
 * This tool uploads files (receipts, invoices, etc.) and returns an attachment URL that can be used
 * when creating or updating bank transaction explanations.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    // Validate required inputs
    if (!input.fileName) {
      return "❌ File name is required.";
    }

    if (!input.contentType) {
      return "❌ Content type (MIME type) is required. Common types: image/jpeg, image/png, application/pdf, text/csv";
    }

    if (!input.fileData) {
      return "❌ File data is required. Please provide the file content as base64 encoded string.";
    }

    // Validate content type
    const validContentTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/tiff",
      "application/pdf",
      "text/csv",
      "application/csv",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!validContentTypes.includes(input.contentType.toLowerCase())) {
      return `❌ Unsupported content type: ${input.contentType}. Supported types: ${validContentTypes.join(", ")}`;
    }

    // Strip any data: URI prefix so the API always receives raw base64 (and to keep
    // validation aligned with what we actually send). Buffer.from(..., "base64")
    // silently drops bad chars, so we check the character set + padding explicitly.
    const rawBase64 = input.fileData.replace(/^data:[^;]+;base64,/, "").trim();
    if (!isValidBase64(rawBase64)) {
      return "❌ Invalid file data format. Please provide valid base64 encoded content.";
    }

    // Prepare attachment data
    const attachmentData: AttachmentUploadData = {
      file_name: input.fileName,
      content_type: input.contentType,
      data: rawBase64,
    };

    if (input.description) {
      attachmentData.description = input.description;
    }

    // Upload the attachment
    const attachment = await uploadAttachment(token, attachmentData);

    let result = `✅ **File Uploaded Successfully!**\n\n`;
    result += `📎 **File**: ${attachment.file_name}\n`;
    result += `📏 **Size**: ${Math.round(attachment.file_size / 1024)} KB\n`;
    result += `🗂️ **Type**: ${attachment.content_type}\n`;

    if (attachment.description) {
      result += `📝 **Description**: ${attachment.description}\n`;
    }

    result += `\n🔗 **Attachment URL**: ${attachment.url}\n`;

    if (attachment.content_src) {
      result += `\n🔍 **Download Link**: ${attachment.content_src}\n`;
      if (attachment.expires_at) {
        result += `⏰ **Link Expires**: ${attachment.expires_at}\n`;
      }
    }

    result += `\n💡 **Next Steps**:\n`;
    result += `• **Copy the Attachment URL above** - you'll need this to attach the file to explanations\n`;
    result += `• Use **add-bank-transaction-explanation** tool with the attachmentUrl parameter\n`;
    result += `• Or use **update-bank-transaction-explanation** tool to add this to existing explanations\n`;
    result += `• The attachment URL format is: ${attachment.url}\n`;

    result += `\n📚 **Usage Examples**:\n`;
    result += `• For new explanations: Include attachmentUrl="${attachment.url}" when creating explanations\n`;
    result += `• For existing explanations: Use update tool with attachmentUrl="${attachment.url}"\n`;

    return result;
  } catch (error) {
    console.error("File upload error:", error);

    if (error instanceof Error) {
      if (error.message.includes("400")) {
        return `❌ Invalid file data. Please check that:\n• The file data is properly base64 encoded\n• The content type matches the actual file type\n• The file name includes a proper extension\n• The file size is not too large (typically max 10MB)`;
      }
      if (error.message.includes("413")) {
        return `❌ File too large. Please reduce the file size and try again. Most services limit uploads to 10MB or less.`;
      }
      if (error.message.includes("415")) {
        return `❌ Unsupported file type. Please use common file types like PDF, JPEG, PNG, or CSV.`;
      }
      if (error.message.includes("401") || error.message.includes("403")) {
        return `❌ Authentication failed. Please re-authenticate with FreeAgent.`;
      }
      if (error.message.includes("422")) {
        return `❌ Validation error. This might occur if:\n• The base64 data is corrupted or invalid\n• The file name contains invalid characters\n• The content type doesn't match the file content`;
      }
    }

    return `❌ Unable to upload file. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
