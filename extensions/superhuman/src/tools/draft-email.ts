import { open, getPreferenceValues } from "@raycast/api";
import { Tool } from "@raycast/api";

interface Preferences {
  enableDraftPreviews: boolean;
}

/**
 * Input parameters for the draft-email tool
 * This tool is specifically for creating a new email draft with provided information,
 * NOT for searching emails. It assumes you already have the recipient information.
 * If the email contains markdown links, they will be converted to plain text and you must then convert to rich media.
 */
type Input = {
  /**
   * The email address of the recipient
   */
  recipient?: string;

  /**
   * Comma-separated list of CC recipients
   */
  cc?: string;

  /**
   * Comma-separated list of BCC recipients
   */
  bcc?: string;

  /**
   * The subject line of the email
   */
  subject?: string;

  /**
   * The body content of the email
   */
  body?: string;
};

/**
 * Optional confirmation before creating an email draft
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { enableDraftPreviews } = getPreferenceValues<Preferences>();

  // If draft previews are disabled, skip confirmation
  if (!enableDraftPreviews) {
    return undefined;
  }

  // Check if recipient is properly formatted as an email address
  if (input.recipient && !hasValidEmailAddress(input.recipient)) {
    return {
      message: `⚠️ Warning: "${input.recipient}" does not appear to be a valid email address.
Always use full email addresses (e.g., "name@example.com") rather than just names.
      
Please correct the recipient format before creating the draft.`,
      image: "⚠️",
    };
  }

  let message = "Create email draft";
  const image = "✉️";

  if (input.recipient) {
    message += ` to: ${input.recipient}`;
  }

  if (input.subject) {
    message += `\nSubject: ${input.subject}`;
  }

  // Create email preview content for confirmation dialog
  const info = [];

  if (input.recipient) {
    info.push({ name: "To", value: input.recipient });
  }

  if (input.cc) {
    info.push({ name: "CC", value: input.cc });
  }

  if (input.bcc) {
    info.push({ name: "BCC", value: input.bcc });
  }

  if (input.subject) {
    info.push({ name: "Subject", value: input.subject });
  }

  if (input.body) {
    info.push({ name: "Body", value: input.body });
  }

  return {
    message,
    image,
    info,
  };
};

/**
 * Checks if a recipient string contains a valid email address
 * @param recipient The recipient string to check
 * @returns Whether the recipient contains an @ symbol
 */
function hasValidEmailAddress(recipient: string): boolean {
  return recipient.includes("@");
}

/**
 * Converts Markdown links to plain URLs to ensure they work in email clients
 * @param text The text that may contain Markdown links
 * @returns Text with Markdown links converted to plain URLs
 */
function convertMarkdownLinksToPlainText(text: string): string {
  if (!text) return text;

  // Replace Markdown links [text](url) with formatted text (handles URL parameters better)
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    // Make sure we don't lose any URL parameters by keeping the URL intact
    return `${linkText}: ${url}`;
  });
}

/**
 * Ensures recipient has a proper email format
 * @param recipient The recipient string to check and format if needed
 * @returns A properly formatted email address
 */
function ensureProperEmailFormat(recipient?: string): string | undefined {
  if (!recipient) return undefined;

  // If it already has an @ symbol, assume it's properly formatted
  if (recipient.includes("@")) {
    return recipient;
  }

  // Otherwise, append @example.com
  return `${recipient.toLowerCase()}@example.com`;
}

/**
 * Creates a new email draft using Superhuman deeplinks.
 * This tool should be used for composing emails when you have recipient information,
 * not for searching emails.
 */
export default async function tool(input: Input): Promise<string> {
  try {
    console.log(`Creating email draft in Superhuman`);

    // Ensure recipient has proper email format
    input.recipient = ensureProperEmailFormat(input.recipient);

    // Convert any Markdown links to plain text
    if (input.body) {
      const originalBody = input.body;
      input.body = convertMarkdownLinksToPlainText(input.body);

      if (originalBody !== input.body) {
        console.log("Converted Markdown links to plain text in email body");
        console.log("Original body:", originalBody);
        console.log("Converted body:", input.body);
      }
    }

    let url = "superhuman://~compose/mailto:";
    const params: string[] = [];

    if (input.recipient) params.push(`to=${encodeURIComponent(input.recipient)}`); // who to send to
    if (input.cc) params.push(`cc=${encodeURIComponent(input.cc)}`); // cc
    if (input.bcc) params.push(`bcc=${encodeURIComponent(input.bcc)}`); // bcc
    if (input.subject) params.push(`subject=${encodeURIComponent(input.subject)}`); // subject
    if (input.body) params.push(`body=${encodeURIComponent(input.body)}`); // body

    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    console.log(`Opening Superhuman with URL: ${url}`); // open the url in superhuman
    await open(url);

    return `Email draft created successfully${input.recipient ? ` for ${input.recipient}` : ""}`; // return a success message
  } catch (error) {
    console.error("Failed to create email draft:", error);
    return `Failed to create email draft: ${String(error)}. Please try again.`;
  }
}
