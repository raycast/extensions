import { Tool } from "@raycast/api";
import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The scheduled email ID. Get it from list-emails. */
  emailId: string;
  /** The new send time as an ISO 8601 datetime. */
  scheduledAt: string;
};

const tool = async (input: Input) => {
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("The scheduled time must be a valid ISO 8601 datetime");
  }

  const response = await getResend().emails.update({
    id: input.emailId,
    scheduledAt: scheduledAt.toISOString(),
  });
  return unwrapResponse(response, "reschedule email");
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  title: "Reschedule Email",
  message: "Change when this email will be sent?",
  info: [
    { name: "Email ID", value: input.emailId },
    { name: "New Send Time", value: new Date(input.scheduledAt).toLocaleString() },
  ],
});

export default withResend(tool);
