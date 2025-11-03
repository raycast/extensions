import { resend } from "../lib/resend";

/**
 * Tool to list all Emails from Resend
 * Returns the list of Emails with their details
 */
const tool = async () => {
  const { data, error } = await resend.emails.list();

  if (error) {
    throw new Error(`Failed to list emails: ${error.message}`);
  }

  return data;
};

export default tool;
