import { Tool } from "@raycast/api";
import { resend } from "../lib/resend";

type Input = {
  /**
   * The ID of the email to cancel.
   * This is required to identify which email to cancel.
   * You can get this ID from the send email response.
   */
  emailId: string;
};

const tool = async (input: Input) => {
  const { data, error } = await resend.emails.cancel(input.emailId);

  if (error) {
    throw new Error(`Failed to cancel email: ${error.message}`);
  }

  return data;
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    title: "Cancel Email",
    message: "Are you sure you want to cancel this scheduled email? This action cannot be undone.",
    info: [{ name: "Email ID", value: input.emailId }],
  };
};

export default tool;
