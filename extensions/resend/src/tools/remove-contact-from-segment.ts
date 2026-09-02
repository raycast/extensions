import { Tool } from "@raycast/api";
import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /** The segment ID. Get it from list-segments. */
  segmentId: string;
  /** The segment name, shown only in the confirmation dialog. */
  segmentName: string;
  /** The contact ID. Get it from list-contacts. */
  contactId?: string;
  /** The contact email, used as the identifier when contactId is unavailable. */
  contactEmail?: string;
};

const tool = async (input: Input) => {
  if (!input.contactId && !input.contactEmail) {
    throw new Error("Provide contactId or contactEmail to identify the contact");
  }

  const response = await getResend().contacts.segments.remove({
    segmentId: input.segmentId,
    ...(input.contactId ? { contactId: input.contactId } : { email: input.contactEmail as string }),
  });
  return unwrapResponse(response, "remove contact from segment");
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  title: "Remove Contact from Segment",
  message: "Remove this contact from the selected segment? The contact will not be deleted.",
  info: [
    { name: "Segment", value: input.segmentName },
    { name: input.contactEmail ? "Contact" : "Contact ID", value: input.contactEmail || input.contactId || "" },
  ],
});

export default withResend(tool);
