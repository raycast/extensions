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

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Load the user's mail accounts if this is the first time they're
  // using the extension.
  await getAccounts();

  const account = Cache.getDefaultAccount();
  if (!account) {
    throw new Error("No accounts found");
  }

  const infoItems = [
    { name: "From", value: account.emails[0] },
    { name: "To", value: input.to.join(", ") },
    { name: "Subject", value: input.subject },
    { name: "Content", value: input.content },
  ];

  if (input.cc) {
    infoItems.push({ name: "CC", value: input.cc.join(", ") });
  }

  if (input.bcc) {
    infoItems.push({ name: "BCC", value: input.bcc.join(", ") });
  }

  if (input.attachments) {
    infoItems.push({ name: "Attachments", value: `${input.attachments.length} file(s)` });
  }

  return {
    message: "Are you sure you want to send the following email?",
    info: infoItems,
  };
};

export default async function (input: Input) {
  // Load the user's mail accounts if this is the first time they're
  // using the extension.
  await getAccounts();

  const account = Cache.getDefaultAccount();
  if (!account) {
    throw new Error("No accounts found");
  }

  try {
    await sendMessage({
      account: account.id,
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
