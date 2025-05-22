import { Resend } from "resend";
import { API_KEY } from "../utils/constants";
import "cross-fetch/polyfill";

const resend = new Resend(API_KEY);

type Input = {
  /**
   * The ID of the email to retrieve.
   * This is required to identify which email to fetch.
   * You can get this ID from the send email response.
   */
  emailId: string;
};

const tool = async (input: Input) => {
  const { data, error } = await resend.emails.get(input.emailId);

  if (error) {
    throw new Error(`Failed to retrieve email: ${error.message}`);
  }

  return data;
};

export default tool;
