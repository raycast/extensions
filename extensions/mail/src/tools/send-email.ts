import type { Tool } from "@raycast/api";
import { sendMessage } from "../scripts/messages";
import { Cache } from "../utils/cache";
import { getAccounts } from "../scripts/accounts";

type Input = {
  /**
   * The recipient email addresses.
   *
   * This must be a valid email address from the account's address book
   * which you must get using the `list-addresses` tool.
   */
  to: string[];

  /**
   * The recipient email addresses to CC.
   *
   * This must be a valid email address from the account's address book
   * which you must get using the `list-addresses` tool.
   */
  cc: string[];

  /**
   * The recipient email addresses to BCC.
   *
   * This must be a valid email address from the account's address book
   * which you must get using the `list-addresses` tool.
   */
  bcc: string[];

  /**
   * The email address to send from.
   *
   * This must be one of the user's email addresses from their accounts.
   * You can get available email addresses using the `list-account-emails` tool.
   * If not provided, the default account's first email address will be used.
   */
  from?: string;

  /**
   * The subject of the email.
   *
   * Always include a relevant subject, but don't include any prefixes such as "Re:".
   */
  subject: string;

  /**
   * The content of the message.
   * Don't include any introduction or salutation. Just the main content.
   */
  content: string;

  /**
   * A list of absolute file paths to attach to the email.
   */
  attachments?: string[];
};

/**
 * Gets the email address to use for sending.
 * If `fromEmail` is provided, validates it exists in an account.
 * Otherwise, uses the default account's first email address.
 */
async function getFromEmail(fromEmail?: string): Promise<string> {
  const accounts = await getAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found");
  }

  if (fromEmail) {
    // Validate that the email address exists in an account
    const account = accounts.find((acc) => acc.emails.includes(fromEmail));
    if (!account) {
      throw new Error(`Email address "${fromEmail}" not found in any account`);
    }
    return fromEmail;
  } else {
    const defaultAccount = Cache.getDefaultAccount();
    if (!defaultAccount) {
      throw new Error("No accounts found");
    }
    return defaultAccount.emails[0];
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const fromEmail = await getFromEmail(input.from);

  const infoItems = [
    { name: "From", value: fromEmail },
    { name: "To", value: input.to.join(", ") },
    { name: "Subject", value: input.subject },
    { name: "Content", value: input.content },
  ];

  if (input.cc && input.cc.length > 0) {
    infoItems.push({ name: "CC", value: input.cc.join(", ") });
  }

  if (input.bcc && input.bcc.length > 0) {
    infoItems.push({ name: "BCC", value: input.bcc.join(", ") });
  }

  if (input.attachments && input.attachments.length > 0) {
    infoItems.push({ name: "Attachments", value: `${input.attachments.length} file(s)` });
  }

  return {
    message: "Are you sure you want to send the following email?",
    info: infoItems,
  };
};

export default async function (input: Input) {
  const fromEmail = await getFromEmail(input.from);

  try {
    await sendMessage({
      from: fromEmail,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      content: input.content,
      attachments: input.attachments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to send email: ${message}`);
  }
}
