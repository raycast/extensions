import { Tool } from "@raycast/api";
import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The sent or received email ID. */
  emailId: string;
  /** Human-readable duration such as `10m`, `2 hours`, or `1 day`. Maximum 48 hours. */
  expiresIn?: string;
};

const tool = async (input: Input) => {
  const response = await getResend().emails.share(input.emailId, { expiresIn: input.expiresIn || "48 hours" });
  return unwrapResponse(response, "share email");
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  title: "Create Public Share Link",
  message: "Anyone with this temporary link will be able to view the email.",
  info: [
    { name: "Email ID", value: input.emailId },
    { name: "Expires In", value: input.expiresIn || "48 hours" },
  ],
});

export default withResend(tool);
