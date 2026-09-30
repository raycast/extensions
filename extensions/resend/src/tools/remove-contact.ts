import { Action, Tool } from "@raycast/api";
import { getResend, withResend } from "../lib/oauth";
import { unwrapResponse } from "./utils";

type Input = {
  /**
   * Legacy audience ID used to scope removal. Usually unnecessary.
   */
  audienceId?: string;

  /**
   * The name of the audience.
   * This is used for confirmation purposes only.
   * You can get this from the list-audiences tool first.
   */
  audienceName?: string;

  /**
   * The ID of the contact to remove.
   * Either this or contactEmail is required to identify which contact to delete.
   * You can get this ID by using the list-contacts tool first.
   */
  contactId?: string;

  /**
   * The email of the contact to remove.
   * This can identify the contact when contactId is unavailable and is displayed in the confirmation.
   * You can get this email by using the list-contacts tool first.
   */
  contactEmail?: string;

  /**
   * The first name of the contact to remove.
   * This is used for confirmation purposes only.
   * You can get this from the list-contacts tool first.
   */
  contactFirstName?: string;

  /**
   * The last name of the contact to remove.
   * This is used for confirmation purposes only.
   * You can get this from the list-contacts tool first.
   */
  contactLastName?: string;
};

const tool = async (input: Input) => {
  if (!input.contactId && !input.contactEmail) {
    throw new Error("Provide contactId or contactEmail to identify the contact");
  }

  const resend = getResend();
  const { data, error } = await resend.contacts.remove({
    ...(input.audienceId ? { audienceId: input.audienceId } : {}),
    ...(input.contactId ? { id: input.contactId } : { email: input.contactEmail as string }),
  });

  if (error) {
    throw new Error(`Failed to remove contact: ${error.message}`);
  }

  return data;
};

const confirmRemoval: Tool.Confirmation<Input> = async (input: Input) => {
  const infoItems = [];
  const contact = input.contactId
    ? unwrapResponse(
        await getResend().contacts.get({
          id: input.contactId,
          ...(input.audienceId ? { audienceId: input.audienceId } : {}),
        }),
        "retrieve contact for removal confirmation",
      )
    : undefined;

  if (input.audienceName) infoItems.push({ name: "Audience", value: input.audienceName });

  const firstName = contact ? contact.first_name : input.contactFirstName;
  if (firstName) {
    infoItems.push({ name: "First Name", value: firstName });
  }

  const lastName = contact ? contact.last_name : input.contactLastName;
  if (lastName) {
    infoItems.push({ name: "Last Name", value: lastName });
  }

  const email = contact?.email || input.contactEmail;
  if (email) infoItems.push({ name: "Contact Email", value: email });
  if (input.contactId) infoItems.push({ name: "Contact ID", value: input.contactId });

  return {
    style: Action.Style.Destructive,
    title: "Remove Contact",
    message: "Are you sure you want to remove this contact? This action cannot be undone.",
    info: infoItems,
  };
};

export const confirmation: Tool.Confirmation<Input> = withResend(confirmRemoval);

export default withResend(tool);
