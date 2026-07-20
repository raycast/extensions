import { getResend, withResend } from "../lib/oauth";

/**
 * Tool to list all Emails from Resend
 * Returns the list of Emails with their details
 */
const tool = async () => {
  const resend = getResend();
  const { data, error } = await resend.emails.list();

  if (error) {
    throw new Error(`Failed to list emails: ${error.message}`);
  }

  return data;
};

export default withResend(tool);
