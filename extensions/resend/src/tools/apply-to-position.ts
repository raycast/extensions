import type { Tool } from "@raycast/api";
import { withResend } from "../lib/oauth";
import {
  ApplicationInput,
  applicationInfo,
  applyToPosition,
  retrievePosition,
  validateApplication,
  validateResume,
} from "../lib/positions";

export const confirmation: Tool.Confirmation<ApplicationInput> = withResend(async (input: ApplicationInput) => {
  const position = await retrievePosition(input.positionId);
  validateApplication(position, input);
  await validateResume(input.resumePath);
  return {
    title: "Submit Job Application",
    message: "Send these answers and your resume to Resend?",
    info: applicationInfo(position, input),
  };
});

export default withResend(async (input: ApplicationInput) => applyToPosition(input));
