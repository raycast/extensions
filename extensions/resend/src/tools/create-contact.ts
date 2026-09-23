import { Tool } from "@raycast/api";
import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** Segment ID to add the contact to. Get it from list-segments. */
  segmentId?: string;
  /** Segment name, shown only in the confirmation dialog. */
  segmentName?: string;
  /** Legacy audience ID. Prefer segmentId for new calls. */
  audienceId?: string;
  /** Legacy audience name, shown only in the confirmation dialog. */
  audienceName?: string;
  /** The contact's first name. */
  firstName?: string;
  /** The contact's last name. */
  lastName?: string;
  /** The contact's email address. */
  email: string;
  /** Whether the contact should start unsubscribed. */
  unsubscribed?: boolean;
};

const tool = async (input: Input) => {
  const response = input.segmentId
    ? await getResend().contacts.create({
        email: input.email,
        segments: [{ id: input.segmentId }],
        ...(input.firstName ? { firstName: input.firstName } : {}),
        ...(input.lastName ? { lastName: input.lastName } : {}),
        ...(input.unsubscribed !== undefined ? { unsubscribed: input.unsubscribed } : {}),
      })
    : await getResend().contacts.create({
        ...(input.audienceId ? { audienceId: input.audienceId } : {}),
        ...(input.firstName ? { firstName: input.firstName } : {}),
        ...(input.lastName ? { lastName: input.lastName } : {}),
        ...(input.unsubscribed !== undefined ? { unsubscribed: input.unsubscribed } : {}),
        email: input.email,
      });

  return unwrapResponse(response, "create contact");
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const infoItems = [];

  if (input.segmentName) infoItems.push({ name: "Segment", value: input.segmentName });
  else if (input.audienceName) infoItems.push({ name: "Audience", value: input.audienceName });
  if (input.firstName) infoItems.push({ name: "First Name", value: input.firstName });
  if (input.lastName) infoItems.push({ name: "Last Name", value: input.lastName });
  infoItems.push({ name: "Email", value: input.email });
  if (input.unsubscribed !== undefined) {
    infoItems.push({ name: "Unsubscribed", value: input.unsubscribed ? "Yes" : "No" });
  }

  return {
    message: `New contact:`,
    info: infoItems,
  };
};

export default withResend(tool);
